# Lightbot
## Description
Lightbot is an education game about programming designed for introductory courses to logical thinking.
## Deploying or self-hosting the game
The content of the "deploy" folder is everything that you need in order to get started. Simply download the entire contents of the "deploy" folder and open the index.html locally in your web browser. Since the latest update, no server is needed anymore in order to run the game.

## Developing with github codespace
```
/workspaces/Lightbot/src/develop (master) $ python -m http.server 8000
```

## More description on case 16 lightbot app level 6-3
This is a programming puzzle where you need to guide a character to reach all the blue tiles, using a combination of procedures and basic commands like walk, jump, turn left/right, and light.
Looking at the current solution in the MAIN sequence:
proc1, proc2, proc2, proc2, turnRight, proc1, proc1, walk, turnRight, proc2

What PROC1 and PROC2 do:

PROC1: proc2, turnRight, turnRight
PROC2: walk, jump, walk, walk, jump, light, turnRight


## thoughts on finding the lowest number of blocks 
for case 16, the straight forward (no P1/P2) steps are
FFFJLJJRJFRFJL RRJFLFJ JLFRJFFL 29 steps, or 
FFFJLJJRJFRFJL JJRJ    JLJLFRJFFL 28 steps
if one proc only has two blocks it needs to repeat more two times to reduce one block
assume one proc has at least three blocks

notice J can be noop if no height change while F is noop in case of height change (for next move)
so, safe to add F in front of J and J in front of F, if it helps to create repeat pattern in the straght forwad sequences
FFFJLJJRJFRFJ? JJRJ    JLJLFRJFF?
JFFFJLJJRJFRFJ? JJRJ    JLJLFRJFFFJ?
p=JFFFJL
pJJRJFRFJ? JJRJ    JLJLFRp

FFFJLJJ RJF RFJ?R RJF LFJJLF RJF F?
p=RJF
FFFJLJJpRFJLRp?FJJLFpF? =>
FFFJLJJpRFJLRp?FJJLFpFJ?
P=FJ FFPLJJpRPLRp?PJLFpP?

pPPPRppFRP => PRRPPPRPRRPRRFRP => FJFFJ?R RR FJFFJ?R FJFFJ?R FJFFJ?R R FJFFJ?R RR FJFFJ?R RRFR FJFFJ?R
p=PRR
P=FJFFJ?R


PPO https://arxiv.org/pdf/1707.06347
https://github.com/ericyangyu/PPO-for-Beginners
https://github.com/tsmatz/reinforcement-learning-tutorials/blob/master/04-ppo.ipynb

berkley deep RL course work
https://github.com/berkeleydeeprlcourse/homework/tree/master/hw4
reinforcement learning book
http://incompleteideas.net/book/RLbook2020.pdf
