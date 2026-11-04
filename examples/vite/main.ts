import "@johnmorrisdotca/tsunagi/element/define";

const board = document.querySelector("tsunagi-board")!;
board.addEventListener("tsunagi-solve", (event) => console.log((event as CustomEvent).detail.answer));
