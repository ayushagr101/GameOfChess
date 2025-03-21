// Frontend.js - Client-side Chess Game Implementation

// Load the socket.io client
const socket = io();

const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let draggedPieceSource = null;
let playerRole = "w"; // Default player role (lowercase to match chess.js)

// Initialize the board when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    renderBoard();
    
    // Add connection status logging
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
    });
});

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    
    for (let rowIndex = 0; rowIndex < 8; rowIndex++) {
        for (let squareIndex = 0; squareIndex < 8; squareIndex++) {
            const squareElement = document.createElement("div");
            squareElement.classList.add(
                "square",
                (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
            );

            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            const piece = board[rowIndex][squareIndex];
            if (piece) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add(
                    "piece",
                    piece.color === "w" ? "white" : "black"
                );
                pieceElement.innerHTML = getPieceUnicode(piece);
                pieceElement.draggable = playerRole === piece.color;

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        draggedPieceSource = { row: rowIndex, col: squareIndex };
                        e.dataTransfer.setData("text/plain", "");
                    }
                });
                pieceElement.addEventListener("dragend", () => {
                    draggedPiece = null;
                    draggedPieceSource = null;
                });

                squareElement.appendChild(pieceElement);
            }
            
            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault();
            });
            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSource = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(draggedPieceSource, targetSource);
                }
            });
            
            boardElement.appendChild(squareElement);
        }
    
	}
	if(playerRole ==='b'){
		boardElement.classList.add('flip');
	}
	else{
		boardElement.classList.remove('flip');
	}
};

const handleMove = (draggedPieceSource, targetSource) => {
    const move = {
        from: `${String.fromCharCode(97 + draggedPieceSource.col)}${8 - draggedPieceSource.row}`,
        to: `${String.fromCharCode(97 + targetSource.col)}${8 - targetSource.row}`,
        promotion: 'q', // Default to queen for pawn promotion
    };
    
    // Try to make the move locally
    try {
        const result = chess.move(move);
        
        if (result) {
            // If move is valid, send it to the server
            socket.emit('move', move);
            console.log('Move sent to server:', move);
            // No need to render here - will render when server broadcasts the move
        } else {
            console.log('Invalid move:', move);
        }
    } catch (error) {
        console.error('Error making move:', error);
    }
};

const getPieceUnicode = (piece) => {
    const unicodeSymbols = {
		k: "♔",  // White King
		q: "♕",  // White Queen
		r: "♖",  // White Rook
		b: "♗",  // White Bishop
		n: "♘",  // White Knight
		p: "♙",  // White Pawn
		K: "♚",  // Black King
		Q: "♛",  // Black Queen
		R: "♜",  // Black Rook
		B: "♝",  // Black Bishop
		N: "♞",  // Black Knight
		P: "♟",  // Black Pawn,  // Black Pawn
	};
	
    
    // Updated to handle chess.js format (lowercase type with color property)
    const pieceKey = piece.color === 'b' ? piece.type.toUpperCase() : piece.type;
    return unicodeSymbols[pieceKey] || "";
};

// Socket event handlers
socket.on("playerRole", (role) => {
    console.log("Assigned role:", role);
    playerRole = role.toLowerCase(); // Ensure lowercase for consistency
    renderBoard();
});

socket.on("spectatorRole", () => {
    console.log("Assigned as spectator");
    playerRole = null;
    renderBoard();
});

socket.on("boardState", (fen) => {
    console.log("Received board state:", fen);
    chess.load(fen);
    renderBoard();
});

socket.on("move", (move) => {
    console.log("Received move from server:", move);
    chess.move(move);
    renderBoard();
});

socket.on("moveError", (message) => {
    console.error("Move error:", message);
    // Could add visual feedback here for the player
});x``