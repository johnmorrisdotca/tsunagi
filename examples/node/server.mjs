// A server checks an answer with the same rules the board plays by: pure functions, no DOM, no browser globals.
import { checkTsunagiAnswer, dailyTsunagiLevel } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_6 } from "@johnmorrisdotca/tsunagi/levels-6";

const today = dailyTsunagiLevel(6, new Date()); // the level of the day at 6×6: 1 to 256
const [givens, answer] = TSUNAGI_6[today - 1]; // send givens to the browser; keep the answer
console.log(checkTsunagiAnswer(6, givens, answer), TSUNAGI_6.length); // { ok: true } 256
