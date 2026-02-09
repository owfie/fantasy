---
title: "Half Time! A mid-season analysis"
author: "AJ Edgeworth"
tags: ["Opinion"]
headerImage: "/images/articles/ht.jpg"
publishedAt: "2026-02-09T10:00:00Z"
-----------------------------------

Rounds 1-4 of Super League have finished and we are now past the halfway point. With two rounds of pool play remaining, no team is promised a place in the gold medal match. The only sure thing is that after 4 losses, Flyers have secured their spot in the 3-4 game.

Let's break down the position of teams and some possible outcomes. Bear with me as I don't have a degree in combinatorics and my Python skills are questionable.  

### Paths to finals

The ladder sits as below:

1. Force 3–1 (0)

2. Riptide 3–1 (+3)

3. Titans 2–2 (+10)

4. Flyers 0–4 (–13)

*Rankings based on wins, head-to-head, then points difference.*

Force are in the most dominant position and are *almost* guaranteed a spot in finals. Repeating their wins against Riptide and Flyers will put them comfortably top of the ladder with 5-1 at the end of pool play, which seems like a simple feat with captain Eichner returning to play as of Round 5. Only one win against either team is necessary to guarantee* a spot in the top 2, and most scenarios permit Force to lose both of their remaining games and still qualify. The caveat is that if Force go winless and Titans go 2-0, Force are OUT.

Riptide are currently in a relatively safe position: down on head-to-head vs Force, but up on head-to-head vs Titans. Their spot in the top 2 is secured* if they win either of their remaining games against Force or Titans. Riptide are in a slightly less advantageous position to Force, though. If they go winless for the remainder of pool play, there is no outcome where they end up in top 2. 

The window for West Beach Titans is narrow, but not closed. 2 wins is ideal and locks in* a top 2 finish, but they have outs in case they can only scrape up 1 victory. Titans trump card is their banked up points difference: currently at +10, five of the eight paths to finals involve winning the tiebreaker in the 2nd/3rd position. 

Flyers are dead in the water, but can still cause chaos. 

### \* The Asterisk

It was never going to be that simple. Consider the following:

- Round 5: Riptide beat Force and Titans beat Flyers

- Round 6: Titans beat Riptide and Force beat Flyers

In this case, the ladder looks like:

- 1st (contending): Titans 4-4

- 1st (contending): Riptide 4-4

- 1st (contending): Force 4-4

- 4th: Flyers 0-8

Since the head-to-head table is tied in this situation, we go to points difference, which currently favours Titans and Riptide. Eichner will need to make sure he gets as many points on the board as possible to avoid this nightmare.

### Conclusion

Let's look at reality: Flyers will be looking to finish this league at 3-4 at all costs (if we can't come 1st, let's make the other teams suffer). Force should almost certainly make it through (pending an asterisk or two). The real kicker is who earns the 2nd place spot. I'm sure the bookies would favour Riptide, but Super League always finds a way to come down to the barest of margins. 

### Solution Space

See all the possible outcomes below. Asterisks mark where the top 2 will depend on point difference.

`````
Scenario 1
Results: ⚡ win, 🔱 win, 🔱 win, ⚡ win
Final Ladder: ⚡ Force: 5–3, 🔱 Titans: 4–4, 🌊 Riptide: 3–5, 🪽 Flyers: 0–8
Top 2 possible: ⚡ 🔱
==================================================
Scenario 2
Results: ⚡ win, 🔱 win, 🔱 win, 🪽 win
Final Ladder: ⚡ Force: 4–4, 🔱 Titans: 4–4, 🌊 Riptide: 3–5, 🪽 Flyers: 1–7
Top 2 possible: ⚡ 🔱 
==================================================
Scenario 3
Results: ⚡ win, 🔱 win, 🌊 win, ⚡ win
Final Ladder: ⚡ Force: 5–3, 🌊 Riptide: 4–4, 🔱 Titans: 3–5, 🪽 Flyers: 0–8
Top 2 possible: ⚡ 🌊
==================================================
Scenario 4
Results: ⚡ win, 🔱 win, 🌊 win, 🪽 win
Final Ladder: ⚡ Force: 4–4, 🌊 Riptide: 4–4, 🔱 Titans: 3–5, 🪽 Flyers: 1–7
Top 2 possible: ⚡ 🌊
==================================================
Scenario 5
Results: ⚡ win, 🪽 win, 🔱 win, ⚡ win
Final Ladder: ⚡ Force: 5–3, 🌊 Riptide: 3–5, 🔱 Titans: 3–5, 🪽 Flyers: 1–7
Top 2 possible: ⚡ 🌊 🔱*
==================================================
Scenario 6
Results: ⚡ win, 🪽 win, 🔱 win, 🪽 win
Final Ladder: ⚡ Force: 4–4, 🌊 Riptide: 3–5, 🔱 Titans: 3–5, 🪽 Flyers: 2–6
Top 2 possible: ⚡ 🌊 🔱*
==================================================
Scenario 7
Results: ⚡ win, 🪽 win, 🌊 win, ⚡ win
Final Ladder: ⚡ Force: 5–3, 🌊 Riptide: 4–4, 🔱 Titans: 2–6, 🪽 Flyers: 1–7
Top 2 possible: ⚡ 🌊
==================================================
Scenario 8
Results: ⚡ win, 🪽 win, 🌊 win, 🪽 win
Final Ladder: ⚡ Force: 4–4, 🌊 Riptide: 4–4, 🔱 Titans: 2–6, 🪽 Flyers: 2–6
Top 2 possible: ⚡ 🌊
==================================================
Scenario 9
Results: 🌊 win, 🔱 win, 🔱 win, ⚡ win
Final Ladder: ⚡ Force: 4–4, 🌊 Riptide: 4–4, 🔱 Titans: 4–4, 🪽 Flyers: 0–8
Top 2 possible: ⚡ 🌊 🔱*
==================================================
Scenario 10
Results: 🌊 win, 🔱 win, 🔱 win, 🪽 win
Final Ladder: 🌊 Riptide: 4–4, 🔱 Titans: 4–4, ⚡ Force: 3–5, 🪽 Flyers: 1–7
Top 2 possible: 🌊 🔱
==================================================
Scenario 11
Results: 🌊 win, 🔱 win, 🌊 win, ⚡ win
Final Ladder: 🌊 Riptide: 5–3, ⚡ Force: 4–4, 🔱 Titans: 3–5, 🪽 Flyers: 0–8
Top 2 possible: 🌊 ⚡
==================================================
Scenario 12
Results: 🌊 win, 🔱 win, 🌊 win, 🪽 win
Final Ladder: 🌊 Riptide: 5–3, ⚡ Force: 3–5, 🔱 Titans: 3–5, 🪽 Flyers: 1–7
Top 2 possible: 🌊 ⚡ 🔱*
==================================================
Scenario 13
Results: 🌊 win, 🪽 win, 🔱 win, ⚡ win
Final Ladder: ⚡ Force: 4–4, 🌊 Riptide: 4–4, 🔱 Titans: 3–5, 🪽 Flyers: 1–7
Top 2 possible: ⚡ 🌊
==================================================
Scenario 14
Results: 🌊 win, 🪽 win, 🔱 win, 🪽 win
Final Ladder: 🌊 Riptide: 4–4, ⚡ Force: 3–5, 🔱 Titans: 3–5, 🪽 Flyers: 2–6
Top 2 possible: 🌊 ⚡ 🔱*
==================================================
Scenario 15
Results: 🌊 win, 🪽 win, 🌊 win, ⚡ win
Final Ladder: 🌊 Riptide: 5–3, ⚡ Force: 4–4, 🔱 Titans: 2–6, 🪽 Flyers: 1–7
Top 2 possible: 🌊 ⚡
==================================================
Scenario 16
Results: 🌊 win, 🪽 win, 🌊 win, 🪽 win
Final Ladder: 🌊 Riptide: 5–3, ⚡ Force: 3–5, 🔱 Titans: 2–6, 🪽 Flyers: 2–6
Top 2 possible: 🌊 ⚡
==================================================
`````
