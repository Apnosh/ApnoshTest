#!/usr/bin/env python3
"""Static file server with live reload.

Usage: live-server.py [port] [root]

Serves `root` over HTTP and injects a tiny SSE client into every HTML
response. When any .html/.css/.js file under root changes on disk, connected
browsers reload themselves. No dependencies.
"""
import http.server
import functools
import json
import os
import random
import sys
import threading
import time
import urllib.parse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4700
ROOT = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.getcwd()

WATCH_EXT = ('.html', '.css', '.js', '.svg', '.json')
SKIP_DIRS = {'node_modules', 'out', '.git', '__pycache__', 'Library'}

# ---- tiny data store for weekly check-ins (and anon questions) ----
DATA_DIR = os.path.join(ROOT, '.apnosh-data')
os.makedirs(DATA_DIR, exist_ok=True)
STORE_LOCK = threading.Lock()


def _read_json(path, default):
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return default


def _write_json(path, data):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as fh:
        json.dump(data, fh)
    os.replace(tmp, path)


# ---- warm-up question bank (server-owned, no repeats) ----
BANK_FILE = os.path.join(DATA_DIR, 'questions.json')
BUILTIN = [
    "Best thing you ate this week?",
    "A cheap food that's secretly perfect?",
    "What's your comfort show right now?",
    "A small win nobody noticed?",
    "What's on repeat in your headphones?",
    "Best purchase under $50 lately?",
    "A place you'd happily go back to tomorrow?",
    "What made you laugh this week?",
    "Most overrated food, and you'll die on this hill?",
    "A popular thing everyone loves that you just don't get?",
    "Pineapple on pizza: crime or masterpiece?",
    "The pettiest thing that irrationally annoys you?",
    "A trend that'll look ridiculous in five years?",
    "Is a hot dog a sandwich? Defend your answer.",
    "What are you most proud of this month?",
    "Something you changed your mind about recently?",
    "A risk you're glad you took?",
    "When did you last feel truly in flow?",
    "What do you actually want to be doing in three years?",
    "If you got famous for one thing, what would it be?",
    "Your useless superpower, a weirdly specific talent?",
    "You get a Netflix show tomorrow, what's it about?",
    "Ten thousand dollars, spent in 24 hours, go.",
    "A fictional world you'd actually want to live in?",
]


def _load_bank():
    """Caller must hold STORE_LOCK. Seeds from BUILTIN on first use."""
    data = _read_json(BANK_FILE, None)
    if not isinstance(data, list) or not data:
        data = [{'text': t, 'source': 'seed', 'usedWeek': None} for t in BUILTIN]
        _write_json(BANK_FILE, data)
        return data
    changed = False
    for q in data:
        if 'usedWeek' not in q:
            q['usedWeek'] = None
            changed = True
        if 'source' not in q:
            q['source'] = 'team'
            changed = True
    if changed:
        _write_json(BANK_FILE, data)
    return data


def _store(name):
    return os.path.join(DATA_DIR, name + '.json')


def _new_id():
    return '%d-%d' % (int(time.time() * 1000), random.randint(100, 999))


def _list_add(name, item):
    with STORE_LOCK:
        data = _read_json(_store(name), [])
        item['id'] = _new_id()
        item['ts'] = time.time()
        data.append(item)
        _write_json(_store(name), data)
    return item


def _list_remove(name, sid):
    with STORE_LOCK:
        data = [x for x in _read_json(_store(name), []) if str(x.get('id')) != str(sid)]
        _write_json(_store(name), data)
    return len(data)


def _list_update(name, sid, patch):
    with STORE_LOCK:
        data = _read_json(_store(name), [])
        for x in data:
            if str(x.get('id')) == str(sid):
                x.update(patch)
                break
        _write_json(_store(name), data)
    return data


def _norm_tasks(rows):
    """Older rows stored a single `assignee` string; expose everything as a list."""
    for t in rows:
        if 'assignees' not in t:
            a = t.get('assignee')
            t['assignees'] = [a] if a else []
    return rows


def _load_tally():
    """Caller must hold STORE_LOCK. {counts, alltime, log}, migrating the
    older flat {name: int} shape if it is still on disk."""
    raw = _read_json(_store('tally'), {})
    if not isinstance(raw, dict):
        raw = {}
    if not isinstance(raw.get('counts'), dict):
        flat = {k: int(v) for k, v in raw.items() if isinstance(v, (int, float))}
        raw = {'counts': dict(flat), 'alltime': dict(flat), 'log': []}
    raw.setdefault('counts', {})
    raw.setdefault('alltime', {})
    raw.setdefault('log', [])
    return raw


def _warmup(week, reroll=False):
    """Return {picks, remaining, total} for the week. Draws 3 unused questions
    once per week (stable on repeat calls); reroll swaps this week's three."""
    with STORE_LOCK:
        bank = _load_bank()
        released = set()
        if reroll:
            for q in bank:
                if q.get('usedWeek') == week:
                    q['usedWeek'] = None
                    released.add(q['text'])
        already = [q for q in bank if q.get('usedWeek') == week]
        need = 3 - len(already)
        if need > 0:
            unused = [q for q in bank if not q.get('usedWeek')]
            if len(unused) < need:            # bank exhausted, recycle
                for q in bank:
                    if q.get('usedWeek') != week:
                        q['usedWeek'] = None
                unused = [q for q in bank if not q.get('usedWeek')]
            fresh = [q for q in unused if q['text'] not in released]
            if len(fresh) >= need:            # reroll prefers questions not just shown
                unused = fresh
            pick = random.sample(unused, min(need, len(unused)))
            for q in pick:
                q['usedWeek'] = week
            already = already + pick
        _write_json(BANK_FILE, bank)
        picks = [{'text': q['text'], 'source': q.get('source', 'seed')} for q in already[:3]]
        remaining = sum(1 for q in bank if not q.get('usedWeek'))
        return {'picks': picks, 'remaining': remaining, 'total': len(bank)}

INJECT = b"""<script>
(function(){
  try{
    var es = new EventSource('/__reload');
    es.onmessage = function(e){ if(e.data === 'reload') location.reload(); };
  }catch(err){}
})();
</script>
"""


def snapshot():
    """Map of watched file -> mtime, one level of the tree."""
    state = {}
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames
                       if not d.startswith('.') and d not in SKIP_DIRS]
        for name in filenames:
            if name.endswith(WATCH_EXT):
                full = os.path.join(dirpath, name)
                try:
                    state[full] = os.path.getmtime(full)
                except OSError:
                    pass
    return state


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Keep the console quiet except for reloads.
        pass

    # ---- JSON helpers ----
    def _send_json(self, obj, code=200):
        body = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        path = self.path.split('?')[0]
        length = int(self.headers.get('Content-Length', 0) or 0)
        raw = self.rfile.read(length) if length else b'{}'
        try:
            payload = json.loads(raw.decode('utf-8') or '{}')
        except ValueError:
            return self._send_json({'ok': False, 'error': 'bad json'}, 400)

        if path == '/api/checkin':
            week = str(payload.get('week', '')).strip()
            name = str(payload.get('name', '')).strip()
            if not week or not name:
                return self._send_json({'ok': False, 'error': 'week and name required'}, 400)
            store = os.path.join(DATA_DIR, 'checkins-%s.json' % week)
            with STORE_LOCK:
                data = _read_json(store, {})
                data.setdefault(name, {}).update(payload)   # merge, so partial updates work
                _write_json(store, data)
            return self._send_json({'ok': True})

        if path == '/api/question':
            text = str(payload.get('text', '')).strip()
            if not text:
                return self._send_json({'ok': False, 'error': 'text required'}, 400)
            with STORE_LOCK:
                bank = _load_bank()
                bank.append({'text': text[:280], 'source': 'team', 'usedWeek': None})
                _write_json(BANK_FILE, bank)
            return self._send_json({'ok': True, 'count': len(bank)})

        if path == '/api/warmup':
            week = str(payload.get('week', '')).strip()
            if not week:
                return self._send_json({'ok': False, 'error': 'week required'}, 400)
            return self._send_json(_warmup(week, payload.get('action') == 'reroll'))

        if path == '/api/song':
            text = str(payload.get('text', '')).strip()
            if not text:
                return self._send_json({'ok': False, 'error': 'text required'}, 400)
            store = os.path.join(DATA_DIR, 'songs.json')
            with STORE_LOCK:
                data = _read_json(store, [])
                data.append({
                    'id': '%d-%d' % (int(time.time() * 1000), random.randint(100, 999)),
                    'name': str(payload.get('name', '')).strip()[:40],
                    'text': text[:200],
                    'week': str(payload.get('week', ''))[:12],
                    'ts': time.time(),
                })
                _write_json(store, data)
            return self._send_json({'ok': True, 'count': len(data)})

        # ---- tasks ----
        if path == '/api/task':
            title = str(payload.get('title', '')).strip()
            if not title:
                return self._send_json({'ok': False, 'error': 'title required'}, 400)
            item = _list_add('tasks', {
                'title': title[:200],
                'area': str(payload.get('area', 'apnosh'))[:20],
                'client': str(payload.get('client', ''))[:60],
                'urgent': bool(payload.get('urgent')),
                'important': bool(payload.get('important')),
                'assignees': [str(x)[:40] for x in (payload.get('assignees') or ([payload['assignee']] if payload.get('assignee') else []))][:6],
                'week': str(payload.get('week', ''))[:12],
                'due': str(payload.get('due', ''))[:12],
                'time': str(payload.get('time', ''))[:8],
                'done': False,
            })
            return self._send_json({'ok': True, 'id': item['id']})

        if path == '/api/task-update':
            sid = payload.get('id')
            patch = {k: v for k, v in payload.items() if k not in ('id', 'week')}
            if 'done' in patch:
                # stamp which week it was crossed off in, so each meeting can
                # show "completed" without the list growing forever
                patch['doneWeek'] = str(payload.get('week', '')) if patch['done'] else ''
            _list_update('tasks', sid, patch)
            return self._send_json({'ok': True})

        # ---- shot tally (carries over until someone settles up) ----
        if path == '/api/tally':
            with STORE_LOCK:
                data = _load_tally()
                entry_id = None
                if payload.get('reset'):
                    data['counts'] = {}
                    for e in data['log']:
                        e['settled'] = True          # keep the receipts, just close the tab
                else:
                    name = str(payload.get('name', '')).strip()
                    if not name:
                        return self._send_json({'ok': False, 'error': 'name required'}, 400)
                    try:
                        delta = int(payload.get('delta', 0))
                    except (TypeError, ValueError):
                        delta = 0
                    cur = int(data['counts'].get(name, 0))
                    if delta > 0:
                        data['counts'][name] = cur + delta
                        data['alltime'][name] = int(data['alltime'].get(name, 0)) + delta
                        entry_id = _new_id()
                        data['log'].append({
                            'id': entry_id, 'name': name,
                            'reason': str(payload.get('reason', ''))[:160],
                            'ts': time.time(), 'settled': False,
                        })
                    elif delta < 0 and cur > 0:
                        data['counts'][name] = max(0, cur + delta)
                        data['alltime'][name] = max(0, int(data['alltime'].get(name, 0)) + delta)
                        for i in range(len(data['log']) - 1, -1, -1):   # undo most recent open one
                            if data['log'][i]['name'] == name and not data['log'][i].get('settled'):
                                data['log'].pop(i)
                                break
                _write_json(_store('tally'), data)
            return self._send_json({'ok': True, 'tally': data, 'entryId': entry_id})

        if path == '/api/tally-reason':
            sid, reason = payload.get('id'), str(payload.get('reason', ''))[:160]
            with STORE_LOCK:
                data = _load_tally()
                for e in data['log']:
                    if str(e.get('id')) == str(sid):
                        e['reason'] = reason
                        break
                _write_json(_store('tally'), data)
            return self._send_json({'ok': True, 'tally': data})

        # ---- per-person announcements ----
        if path == '/api/note':
            text = str(payload.get('text', '')).strip()
            if not text:
                return self._send_json({'ok': False, 'error': 'text required'}, 400)
            item = _list_add('notes', {
                'name': str(payload.get('name', ''))[:40],
                'text': text[:240],
                'week': str(payload.get('week', ''))[:12],
            })
            return self._send_json({'ok': True, 'id': item['id']})

        if path == '/api/note-remove':
            return self._send_json({'ok': True, 'count': _list_remove('notes', payload.get('id'))})

        if path == '/api/task-remove':
            return self._send_json({'ok': True, 'count': _list_remove('tasks', payload.get('id'))})

        # ---- KPIs (one value per week, so we can show movement) ----
        if path == '/api/kpi':
            label = str(payload.get('label', '')).strip()
            if not label:
                return self._send_json({'ok': False, 'error': 'label required'}, 400)
            item = _list_add('kpis', {'label': label[:60], 'unit': str(payload.get('unit', ''))[:12], 'values': {}})
            return self._send_json({'ok': True, 'id': item['id']})

        if path == '/api/kpi-update':
            sid = str(payload.get('id', ''))
            with STORE_LOCK:
                rows = _read_json(_store('kpis'), [])
                for k in rows:
                    if str(k.get('id')) == sid:
                        if 'label' in payload:
                            k['label'] = str(payload['label'])[:60]
                        if 'week' in payload:
                            vals = k.setdefault('values', {})
                            raw = payload.get('value')
                            if raw in (None, ''):
                                vals.pop(str(payload['week']), None)
                            else:
                                try:
                                    vals[str(payload['week'])] = float(raw)
                                except (TypeError, ValueError):
                                    pass
                        break
                _write_json(_store('kpis'), rows)
            return self._send_json({'ok': True})

        if path == '/api/kpi-remove':
            return self._send_json({'ok': True, 'count': _list_remove('kpis', payload.get('id'))})

        # ---- clients ----
        if path == '/api/client':
            name = str(payload.get('name', '')).strip()
            if not name:
                return self._send_json({'ok': False, 'error': 'name required'}, 400)
            with STORE_LOCK:
                existing = _read_json(_store('clients'), [])
                if any(cl.get('name', '').lower() == name.lower() for cl in existing):
                    return self._send_json({'ok': False, 'error': 'already exists'}, 409)
            item = _list_add('clients', {
                'name': name[:80],
                'status': str(payload.get('status', 'good'))[:12],
            })
            return self._send_json({'ok': True, 'id': item['id']})

        if path == '/api/client-update':
            patch = {k: v for k, v in payload.items() if k != 'id'}
            _list_update('clients', payload.get('id'), patch)
            return self._send_json({'ok': True})

        if path == '/api/client-remove':
            return self._send_json({'ok': True, 'count': _list_remove('clients', payload.get('id'))})

        # ---- open floor ideas ----
        if path == '/api/idea':
            text = str(payload.get('text', '')).strip()
            if not text:
                return self._send_json({'ok': False, 'error': 'text required'}, 400)
            item = _list_add('ideas', {
                'text': text[:240],
                'kind': str(payload.get('kind', 'idea'))[:20],
                'when': str(payload.get('when', ''))[:12],
                'time': str(payload.get('time', ''))[:8],
            })
            return self._send_json({'ok': True, 'id': item['id']})

        if path == '/api/idea-update':
            patch = {k: v for k, v in payload.items() if k != 'id'}
            _list_update('ideas', payload.get('id'), patch)
            return self._send_json({'ok': True})

        if path == '/api/idea-remove':
            return self._send_json({'ok': True, 'count': _list_remove('ideas', payload.get('id'))})

        # ---- availability ----
        if path == '/api/availability':
            week = str(payload.get('week', '')).strip()
            name = str(payload.get('name', '')).strip()
            if not week or not name:
                return self._send_json({'ok': False, 'error': 'week and name required'}, 400)
            with STORE_LOCK:
                data = _read_json(_store('availability'), {})
                wk = data.setdefault(week, {})
                cur = wk.get(name)
                if isinstance(cur, str):            # migrate older note-only shape
                    cur = {'note': cur, 'days': {}}
                if not isinstance(cur, dict):
                    cur = {'note': '', 'days': {}}
                cur.setdefault('note', '')
                cur.setdefault('days', {})
                if 'text' in payload or 'note' in payload:
                    cur['note'] = str(payload.get('text', payload.get('note', '')))[:200]
                if payload.get('day'):
                    state = str(payload.get('state', ''))[:10]
                    if state:
                        cur['days'][str(payload['day'])] = state
                    else:
                        cur['days'].pop(str(payload['day']), None)
                wk[name] = cur
                _write_json(_store('availability'), data)
            return self._send_json({'ok': True, 'availability': wk})

        if path == '/api/song-remove':
            sid = str(payload.get('id', ''))
            store = os.path.join(DATA_DIR, 'songs.json')
            with STORE_LOCK:
                data = _read_json(store, [])
                data = [s for s in data if str(s.get('id', '')) != sid]
                _write_json(store, data)
            return self._send_json({'ok': True, 'count': len(data)})

        return self._send_json({'ok': False, 'error': 'unknown endpoint'}, 404)

    def do_GET(self):
        api = self.path.split('?')[0]
        if api == '/api/checkins':
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            week = (qs.get('week', ['']) or [''])[0]
            store = os.path.join(DATA_DIR, 'checkins-%s.json' % week)
            return self._send_json(_read_json(store, {}))
        if api == '/api/warmup':
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            week = (qs.get('week', ['']) or [''])[0]
            return self._send_json(_warmup(week))
        if api == '/api/questions':
            with STORE_LOCK:
                return self._send_json(_load_bank())
        if api == '/api/songs':
            return self._send_json(_read_json(os.path.join(DATA_DIR, 'songs.json'), []))
        if api == '/api/tasks':
            return self._send_json(_norm_tasks(_read_json(_store('tasks'), [])))
        if api == '/api/ideas':
            return self._send_json(_read_json(_store('ideas'), []))
        if api == '/api/notes':
            return self._send_json(_read_json(_store('notes'), []))
        if api == '/api/clients':
            return self._send_json(_read_json(_store('clients'), []))
        if api == '/api/kpis':
            return self._send_json(_read_json(_store('kpis'), []))
        if api == '/api/tally':
            with STORE_LOCK:
                return self._send_json(_load_tally())
        if api == '/api/availability':
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            week = (qs.get('week', ['']) or [''])[0]
            raw = _read_json(_store('availability'), {}).get(week, {})
            out = {}
            for nm, v in (raw or {}).items():
                if isinstance(v, str):
                    out[nm] = {'note': v, 'days': {}}
                elif isinstance(v, dict):
                    out[nm] = {'note': v.get('note', ''), 'days': v.get('days', {})}
            return self._send_json(out)

        if self.path.split('?')[0] == '/__reload':
            return self.stream_reloads()

        path = self.translate_path(self.path)
        if os.path.isdir(path):
            index = os.path.join(path, 'index.html')
            if os.path.exists(index):
                path = index

        if path.endswith('.html') and os.path.isfile(path):
            return self.serve_html(path)

        return super().do_GET()

    def serve_html(self, path):
        try:
            with open(path, 'rb') as fh:
                body = fh.read()
        except OSError:
            self.send_error(404)
            return

        if b'</body>' in body:
            body = body.replace(b'</body>', INJECT + b'</body>', 1)
        else:
            body += INJECT

        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.end_headers()
        self.wfile.write(body)

    def stream_reloads(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'keep-alive')
        self.end_headers()

        last = snapshot()
        try:
            while True:
                time.sleep(0.4)
                current = snapshot()
                if current != last:
                    last = current
                    changed = 'reload'
                    self.wfile.write(b'data: %s\n\n' % changed.encode())
                    self.wfile.flush()
                    print('[live-server] change detected, reloading browsers')
                else:
                    self.wfile.write(b': ping\n\n')
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            return


def main():
    handler = functools.partial(Handler, directory=ROOT)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    server.daemon_threads = True
    print('[live-server] serving %s' % ROOT)
    print('[live-server] http://localhost:%d/' % PORT)
    print('[live-server] live reload is on')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
