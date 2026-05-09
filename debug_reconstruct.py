def reconstruct_title(guess, raw):
    title = guess.get('title')
    is_movie = guess.get('type') == 'movie'
    is_lonely_ep = guess.get('type') == 'episode' and not guess.get('season')
    print(f"DEBUG: title='{title}', is_movie={is_movie}, is_lonely_ep={is_lonely_ep}")
    if not title or not (is_movie or is_lonely_ep):
        return title
    ep = guess.get('episode')
    res = str(title)
    if ep:
        ep_str = str(ep)
        t_pos = raw.lower().find(title.lower())
        e_pos = raw.lower().find(ep_str)
        print(f"DEBUG: ep='{ep_str}', t_pos={t_pos}, e_pos={e_pos}")
        if e_pos < t_pos: res = f"{ep_str} {res}"
        else: res = f"{res} {ep_str}"
    return res

g1 = {'title': 'Apollo', 'episode': 11, 'type': 'episode'}
print(f"Apollo 11 -> {reconstruct_title(g1, 'Apollo 11.mkv')}")

g2 = {'title': 'Weeks Later', 'episode': 28, 'type': 'episode'}
print(f"28 Weeks Later -> {reconstruct_title(g2, '28 Weeks Later.mkv')}")
