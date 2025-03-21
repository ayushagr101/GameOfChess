const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();

const server = http.createServer(app);
const socketIo = socket(server);

const chess = new Chess();

let players = {};
let currentPlayer = "w"; // Use lowercase to match chess.js expectations

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("board", { title: "GameOfChess" });
});

socketIo.on("connection", function (uniqueSocket) {
    console.log("New connection", uniqueSocket.id);

    if (!players.white) {
        players.white = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "w"); // Lowercase to match chess.js
        console.log("Player assigned as white:", uniqueSocket.id);
    } else if (!players.black) {
        players.black = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "b"); // Lowercase to match chess.js
        console.log("Player assigned as black:", uniqueSocket.id);
    } else {
        uniqueSocket.emit("spectatorRole");
        console.log("Player assigned as spectator:", uniqueSocket.id);
    }

    // Send the current board state to the new connection
    uniqueSocket.emit("boardState", chess.fen());

    // FIXED: Use uniqueSocket (the connected client) for the disconnect event
    uniqueSocket.on("disconnect", function () {
        console.log("Player disconnected:", uniqueSocket.id);
        if (players.white === uniqueSocket.id) {
            console.log("White player disconnected");
            players.white = null;
        } else if (players.black === uniqueSocket.id) {
            console.log("Black player disconnected");
            players.black = null;
        }
    });

    uniqueSocket.on("move", (move) => {
        try {
            console.log("Move received:", move, "Current turn:", chess.turn());
            
            // Check if it's the player's turn
            if (chess.turn() === "w" && players.white !== uniqueSocket.id) {
                throw new Error("It's not your turn");
            }
            if (chess.turn() === "b" && players.black !== uniqueSocket.id) {
                throw new Error("It's not your turn");
            }
            
            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn();
                console.log("Valid move made, current turn:", currentPlayer);
                
                // Broadcast the move to all clients
                socketIo.emit("move", move);
                socketIo.emit("boardState", chess.fen());
                
                // Check for game end conditions
                if (chess.isCheckmate()) {
                    socketIo.emit("gameOver", { 
                        result: "checkmate", 
                        winner: chess.turn() === "w" ? "b" : "w" 
                    });
                } else if (chess.isDraw()) {
                    socketIo.emit("gameOver", { result: "draw" });
                }
            } else {
                console.log("Invalid move:", move);
                uniqueSocket.emit("moveError", "Invalid move");
            }
        } catch (error) {
            console.log("Error:", error.message);
            uniqueSocket.emit("moveError", error.message);
        }
    });
});

server.listen(3000, () => {
    console.log("Server is running on port 3000");
});