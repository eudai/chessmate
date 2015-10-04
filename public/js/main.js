
var game = new Chess()
var delay = 50
var states = []
var turn

var dbs = {
	w: new PouchDB('white'),
	b: new PouchDB('black')
}

// do not pick up pieces if the game is over
// only pick up pieces for White
var onDragStart = function(source, piece, position, orientation) {
  if (game.in_checkmate() === true || game.in_draw() === true ||
    piece.search(/^b/) !== -1) {
    return false;
  }
};

var recordState = function(){
	console.log( game.fen() )
	$.post('/record/' + game.fen() )
}

var makeRandomMove = function() {
	
	recordState();

	if ( game.in_checkmate() ) {

	} else if ( game.in_stalemate() ) {

	} else if ( game.in_draw() ) {

	}

	if ( game.game_over() ) {
		startNewGame()
  	}
	
	var possibleMoves = game.moves();

	// game over
	if (possibleMoves.length === 0) return;

	var randomIndex = Math.floor(Math.random() * possibleMoves.length);
	game.move(possibleMoves[randomIndex]);

	//update board
	board.position(game.fen());

	setTimeout(makeRandomMove,200)
};



var onDrop = function(source, target) {
  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  });

  // illegal move
  if (move === null) return 'snapback';

  // make random legal move for black
  window.setTimeout(makeRandomMove, 250);
};

// update the board position after the piece snap
// for castling, en passant, pawn promotion
var onSnapEnd = function() {
  board.position(game.fen());
};


var calculateRatio = function(stats){
	var ratio = stats.wins / ( stats.losses + stats.draws )
	if ( isNaN(ratio) ) ratio = 0
	return ratio
}


var calculateBestMove = function(data){
	var moves = game.moves()
	if ( !data ) return pickRandom(moves)
	var bestMove = moves[0]
	var bestRatio = calculateRatio( data[bestMove] )
	for ( var i in moves ) {
		var move = moves[i]
		var ratio = calculateRatio( data[move] )
		if ( ratio > bestRatio ) {
			bestMove = move
			bestRatio = ratio
		}
	}
	return bestMove
}

var calculateUntriedMoves = function(data){
	var untriedMoves = []
	var moves = game.moves()
	if ( !data ) return moves
	for ( var key in moves ) {
		var move = moves[keys]
		var stats = data[key]
		var hasStats = stats.wins || stats.wins || stats.draws
		if ( !hasStats ) {
			untriedMoves.push(key)
		}
	}
	return untriedMoves
}

var pickRandom = function(obj){
	var randomIndex = Math.floor( Math.random() * obj.length );
	var keys = Object.keys(obj)
	var key = keys[randomIndex]
	return obj[key];
}

var takeTurn = function(){
	if ( game.game_over() ) {
		recordGame()
		startNewGame()
  	}
  	var id = game.fen()
  	var color = game.turn()
  	dbs[color].get(id).then(makeMove).catch(function(){
  		makeMove()
  	})
}

var makeMove = function(data){
	var possibleMoves = game.moves();
	var move
	if ( game.game_over() ) {
		recordGame()
		startNewGame()
  	}
	if ( possibleMoves.length === 0 ) return;
	var untriedMoves = calculateUntriedMoves(data)
	if ( untriedMoves.length > 0 ) {
		move = pickRandom(untriedMoves)
	} else {
		move = calculateBestMove(data)
	}
	game.move(move)
	board.position(game.fen())
	states.push(game.fen())
	setTimeout(takeTurn,delay)
}

var recordGame = function(){
	var history = game.history({verbose: true})
	var verdict = calculateVerdict()
	for ( var i in history ){
		var id = states[i]
		var move = history[i]
		var db = dbs[move.color]
		db.upsert(id,function(data){
			if (!data[move.san]){
				data[move.san] = {}
			}
			var wins = data[move.san].wins || 0
			var losses = data[move.san].losses || 0
			var draws = data[move.san].losses || 0
			data[move.san] = {
				wins: wins + verdict[move.color].win,
				losses: losses + verdict[move.color].loss,
				draws: draws + verdict[move.color].draw,
			}
			return data
		})
	}
}


var startNewGame = function(){
	states = []
	game.reset()
}


var calculateVerdict = function(){
	var verdict = { b:{}, w:{} }
	var color = game.turn()
	var whiteWins = color == 'b' && game.in_checkmate()
	var blackWins = color == 'w' && game.in_checkmate()
	var isDraw = game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()
	if ( whiteWins ){
		verdict.w.win  = 0
		verdict.w.loss = 0
		verdict.w.draw = 1
		verdict.b.win  = 0
		verdict.b.loss = 1
		verdict.b.draw = 0
	} else if (blackWins) {
		verdict.w.win  = 0
		verdict.w.loss = 1
		verdict.w.draw = 0
		verdict.b.win  = 1
		verdict.b.loss = 0
		verdict.b.draw = 0
	} else if (isDraw) {
		verdict.w.win  = 0
		verdict.w.loss = 0
		verdict.w.draw = 1
		verdict.b.win  = 0
		verdict.b.loss = 0
		verdict.b.draw = 1
	} else {
		console.warn('Unable to determine verdict:', game.fen())
	}
	return verdict
}


var cfg = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
};

board = ChessBoard('board', cfg);




$('#startBtn').on('click', function(){
	board.start()
	takeTurn()
});
$('#clearBtn').on('click', board.clear);
