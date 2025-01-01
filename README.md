# Lightbot
## Description
Lightbot is an education game about programming designed for introductory courses to logical thinking.
## Deploying or self-hosting the game
The content of the "deploy" folder is everything that you need in order to get started. Simply download the entire contents of the "deploy" folder and open the index.html locally in your web browser. Since the latest update, no server is needed anymore in order to run the game.

## Developing with github codespace
```
/workspaces/Lightbot/src/develop (master) $ python -m http.server 8000
```

## thoughts on finding the lowest number of blocks 
for case 16, the straight forward (no P1/P2) steps are
FFFJLJJRJFRFJL RRJFLFJ JLFRJFFL 29 steps, or 
FFFJLJJRJFRFJL JJRJ    JLJLFRJFFL 28 steps
if one proc only has two blocks it needs to repeat more two times to reduce one block
assume one proc has at least three blocks

notice J can be noop if no height change while F is noop in case of height change (for next move)
so, safe to add F in front of J and J in front of F, if it helps to create repeat pattern in the straght forwad sequences
FFFJLJJRJFRFJL JJRJ    JLJLFRJFFL
JFFFJLJJRJFRFJL JJRJ    JLJLFRJFFFJL
p=JFFFJL
pJJRJFRFJL JJRJ    JLJLFRp

FFFJLJJ RJF RFJLR RJF LFJJLF RJF FL
p=RJF
FFFJLJJpRFJLRpLFJJLFpFL

pPPPRppFRP => PRRPPPRPRRPRRFRP => FJFFJLR RR FJFFJLR FJFFJLR FJFFJLR R FJFFJLR RR FJFFJLR RRFR FJFFJLR
p=PRR
P=FJFFJLR
