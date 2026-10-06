# Every call, by job

The calls the README lists first, and the rest. Every export of every entry point, with its signature and its doc comment, is in the [API reference](https://johnmorrisdotca.github.io/tsunagi/api.html).

| Export | What it does |
| --- | --- |
| `decodeLayout(code, size)`, `encodeLayout(cells, walls, more)` | a layout's code and the `LinkLayout` it stands for: marbles (`ends`), cells, walls, waypoints, wrap, portals, hexagon |
| `encodeAnswer(owners)`, `answerOf(layout, lines)`, `linesOfAnswer(layout, answer)` | an answer as a code: a letter for each cell's line, `#` blocked, `+` a bridge |
| `checkTsunagiAnswer(size, layout, answer)` | whether an answer joins every pair as the rules allow, in O(cells); `{ ok: true }` or the first reason it does not |
| `noLines`, `pressAt`, `dragTo`, `dragThrough`, `dragFinger`, `letGo` | drawing, as a finger does it: each takes the lines drawn so far and returns new ones; `dragFinger` keeps the finger's `Reach` over the end of a line that has been through a portal |
| `joined`, `allJoined`, `unjoinedPairs`, `filled`, `ownersOf` | what the lines drawn so far amount to |
| `encodeLines`, `decodeLines` | lines half drawn, as a code, to keep a game and come back to it |
| `countSolutions(layout, limit, budget)` | counts answers up to `limit`, within a `budget` of search steps (dead ends, from 13×13), and returns one |
| `countSolutionsSat(layout, limit, budget, guide, colours)` | the same count made by SAT, a solver that learns from its dead ends: what proves every 13×13 to 15×15 level, and what `countSolutions` is from 13×13; `colours` writes a cell's pair as a variable each (`one-hot`, the default) or as a binary number (`binary`, which a board of dozens of pairs needs) |
| `countSolutionsOfLevel(layout, answer)` | how a level is proved and measured: the search of `countSolutions` to 15×15, and from 16×16 or with portals the SAT search started from the level's own answer, which finds it at once and looks for every other |
| `reducedCandidate(size, random, options)`, `withPortals` | a big board made by taking clues away, with blocked cells, wrap, waypoints or portals; portals put into a filling |
| `candidate`, `repairedCandidate`, `sparseCandidate`, `layoutOf` | a new board from a seeded `Random`: a random filling of lines, cut back to its ends |
| `bridgeCandidate`, `wallCandidate`, `waypointCandidate`, `wrapCandidate`, `hexCandidate`, `bridgeAndWallCandidate` | a board with a twist |
| `measureLevel`, `difficultyScores`, `orderByDifficulty` | how hard a board is: corners, guessing, cells not forced, its longest line |
| `challengesOf`, `isTwist`, `twistRole`, `tsunagiMarks` | what a layout asks of a player, and a level's mark |
| `transformed`, `relettered`, `symmetryKey` | a board turned, mirrored and relettered, and one key for all eight |
| `cheatLine(layout, lines, answer)` | one line of the answer drawn in, for a player who asks for help |
| `newTsunagiGame`, `pressGame`, `dragGame`, `liftGame`, `undoGame`, `restartGame`, `checkGame`, `cheatGame` | a game in play as pure functions: lines, strokes, Undo, explosions, a stroke limit, Check and Cheat; each returns a new game |
| `tsunagiProgress`, `helpOf`, `helpOpensNext`, `strongestTsunagiHelp` | what a game stands at, and which help (Cheat, softened or no explosions) a solve used and what that costs |
| `seededRandom(seed)` | the mulberry32 stream every generator draws from |
| `openTsunagiLevels`, `nextTsunagiLevel`, `firstUnsolvedTsunagiLevel`, `tsunagiBand` | which levels a player may open, which comes next, and which third of a size a level is in; each takes the set (`classic` or `portals`) last |
| `levelCountOf`, `levelSeed`, `setOfSeed` | how many levels a size has in a set, and the one number a record keeps a level of either set by |
| `dailyTsunagiLevel(size, date)`, `tsunagiDay(date)`, `isTsunagiDay(text)` | the level of the day at a size, from the date alone; a date as `YYYY-MM-DD` in UTC; whether a text is a real one |

Every function is pure: it returns new values and never changes what it was given.
