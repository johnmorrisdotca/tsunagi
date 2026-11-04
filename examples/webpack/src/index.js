import "@johnmorrisdotca/tsunagi/element/define";

const board = document.createElement("tsunagi-board");
board.setAttribute("grid", "6");
board.setAttribute("level", "12");
document.body.append(board);
