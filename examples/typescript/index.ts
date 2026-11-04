import { checkTsunagiAnswer, type TsunagiCheck } from "@johnmorrisdotca/tsunagi";
import { TSUNAGI_6 } from "@johnmorrisdotca/tsunagi/levels-6";

const [givens, answer] = TSUNAGI_6[11]!; // level 12
const check: TsunagiCheck = checkTsunagiAnswer(6, givens, answer);
console.log(check.ok, TSUNAGI_6.length);

// @ts-expect-error a list of levels is not a number
const wrong: number = TSUNAGI_6;
console.log(typeof wrong);
