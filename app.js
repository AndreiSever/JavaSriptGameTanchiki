var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);	
const url = "mongodb://localhost:27017/";
var MongoClient = require("mongodb").MongoClient;
var Promise = require('es6-promise').Promise;
players = {};
var playerSpeed = 400;
var bulletSpeed = 500;
var enemySpeed = 100;
app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/ajax1.html');
});
app.get('/monitor', function(req, res){
  res.sendFile(__dirname + '/public/monitor.html');
});
app.get('/resources.js', function(req,res){
    res.sendFile(__dirname+'/file/resources.js');
});
app.get('/socket.io.js', function(req,res){
    res.sendFile(__dirname+'/node_modules/socket.io-client/dist/socket.io.js');
});
app.get('/input.js', function(req,res){
    res.sendFile(__dirname+'/file/input.js');
});
app.get('/sprite.js', function(req,res){
    res.sendFile(__dirname+'/file/sprite.js');
});

app.get('/app.css', function(req,res){
    res.sendFile(__dirname+'/file/app.css');
});
app.get('/terrain.png', function(req,res){
    res.sendFile(__dirname+'/file/terrain.png');
});
app.get('/tank10.png', function(req,res){
    res.sendFile(__dirname+'/file/tank10.png');
});
app.get('/tank12.png', function(req,res){
    res.sendFile(__dirname+'/file/tank12.png');
});
app.get('/sprites.png', function(req,res){
    res.sendFile(__dirname+'/file/sprites.png');
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

io.on('connection', function(socket){
	var name;
	//console.log("hello");
	socket.on('player',function(){
		console.log(players);
		socket.emit('player',players);
	});
	socket.on('name',function(name){
		if(name.length > 0){
			name=name;
			MongoClient.connect("mongodb://localhost:27017/", { useNewUrlParser: true },function(err, client){
                const db = client.db("usersdb");
				const collection = db.collection("users");
				if(err) return console.log(err);
				collection.findOne({name: name},function(err, results){   				
					if(results==null){
						players[socket.id] = {
							name: name,
							pos: [0,200],
							isGameOver: false,
							lastFire: Date.now(),
							difference: 0,
							bullets : [],
							ready : true,
							computerEnemy : {
								pos: [492,200],
								isGameOver: false,
								lastFire: Date.now(),
								difference: 0,
								bullets : [] 
							}
						};
						collection.insertOne(players[socket.id]);
					}else{
						players[socket.id]=results;
						players[socket.id].lastFire=Date.now()+players[socket.id].difference;
						players[socket.id].computerEnemy.lastFire=Date.now()+players[socket.id].difference;
					}
					//console.log(players);
					client.close();		
					socket.emit('start',players[socket.id]);
				});
            });			
		}		
		socket.on('firstload', function() {
			socket.emit('firstload',players[socket.id]);
		}); 	
		socket.on('reset',function(){
			players[socket.id].pos[1] = 200; 
			players[socket.id].isGameOver = false;
			players[socket.id].bullets = [];
			players[socket.id].lastFire = Date.now();
			players[socket.id].computerEnemy.pos[1] = 200; 
			players[socket.id].computerEnemy.isGameOver = false;
			players[socket.id].computerEnemy.bullets = [];
			players[socket.id].computerEnemy.lastFire = Date.now();
			socket.emit('firstload',players[socket.id]);
		});
		socket.on('down',function(time, height, playersize){
			players[socket.id].pos[1] += playerSpeed * time; 
			checkPlayerBounds(socket.id, height, playersize);
			socket.emit('change',players[socket.id]);
		});
		socket.on('up',function(time, height, playersize){
			players[socket.id].pos[1] -= playerSpeed * time;  
			checkPlayerBounds(socket.id, height, playersize);
			socket.emit('change',players[socket.id]);
		});
		socket.on('space',function(playersize){
			if (Date.now() - players[socket.id].lastFire > 250){
				var x = players[socket.id].pos[0] + playersize[0];
				var y = players[socket.id].pos[1] + playersize[1] / 3;
				players[socket.id].lastFire = Date.now();
				players[socket.id].bullets.push({ pos: [x, y] });
			}
		});
		socket.on('update',function(dt,width,computersize,t){	
			if (Date.now() - players[socket.id].computerEnemy.lastFire >500  && !players[socket.id].computerEnemy.isGameOver){
				var x = players[socket.id].computerEnemy.pos[0] - computersize[0]/2;
				var y = players[socket.id].computerEnemy.pos[1] + computersize[1] / 4;
				players[socket.id].computerEnemy.lastFire = Date.now();
				players[socket.id].computerEnemy.bullets.push({ pos: [x, y] });
				
			}
			for(var i=0; i<players[socket.id].computerEnemy.bullets.length; i++) {
				players[socket.id].computerEnemy.bullets[i].pos[0] -= bulletSpeed * dt;
				if(players[socket.id].computerEnemy.bullets[i].pos[0] < 0) {
					players[socket.id].computerEnemy.bullets.splice(i, 1);
					i--;
				}
			}
			for(var i=0; i<players[socket.id].bullets.length; i++) {
				players[socket.id].bullets[i].pos[0] += bulletSpeed * dt;
				if(players[socket.id].bullets[i].pos[0] > width) {
					players[socket.id].bullets.splice(i, 1);
					i--;
				}
			}
			if (players[socket.id].pos[1]>players[socket.id].computerEnemy.pos[1]){
				players[socket.id].computerEnemy.pos[1] += playerSpeed * dt; 
			}
			if (players[socket.id].pos[1]<players[socket.id].computerEnemy.pos[1]){
				players[socket.id].computerEnemy.pos[1] -= playerSpeed * dt; 
			}
			/*MongoClient.connect("mongodb://localhost:27017/", { useNewUrlParser: true }, function(err, client){ 192.168.0.104
				if(err) return console.log(err);
				  
				const db = client.db("usersdb");
				const col = db.collection("users");
				col.updateOne({name: players[socket.id].name},
				{ $set: {
					'pos': [0,players[socket.id].pos[1]],
					'isGameOver': players[socket.id].isGameOver,
					'lastFire': players[socket.id].lastFire,
					'difference': Date.now()-players[socket.id].lastFire,
					'ready': players[socket.id].ready,
					'bullets': players[socket.id].bullets,
				'computerEnemy.pos' : [492,players[socket.id].computerEnemy.pos[1]],
					'computerEnemy.isGameOver' : players[socket.id].computerEnemy.isGameOver,
					'computerEnemy.lastFire' : players[socket.id].computerEnemy.lastFire,
					'difference': Date.now()-players[socket.id].computerEnemy.lastFire,
					'computerEnemy.bullets' : players[socket.id].computerEnemy.bullets,
				}},function(err, result){
						client.close();
					}
				);
			});*/
			console.log(players);
			socket.emit('gameupdate',players[socket.id],t);
		});
		socket.on('checkCollision',function(bulletsize,computersize, playersize ){
			if (!players[socket.id].isGameOver && !players[socket.id].computerEnemy.isGameOver){
				for(var j=0; j<players[socket.id].bullets.length; j++) {
					var pos = players[socket.id].bullets[j].pos;
					if(boxCollides(pos, bulletsize, players[socket.id].computerEnemy.pos, computersize)) {
						players[socket.id].bullets.splice(j, 1);
						players[socket.id].computerEnemy.isGameOver=true;
						
						break;
					}
				}
				for(var j=0; j<players[socket.id].computerEnemy.bullets.length; j++) {
					var pos1 = players[socket.id].computerEnemy.bullets[j].pos;
					if(boxCollides(pos1, bulletsize, players[socket.id].pos, playersize)) {
						players[socket.id].computerEnemy.bullets.splice(j, 1);
						players[socket.id].isGameOver=true;
						break;
					}
				}
				socket.emit('gameover',players[socket.id]);
			}
		});
		
	});	
});
function checkPlayerBounds(id, height, playersize) {
	if(players[id].pos[1] < 0) {
        players[id].pos[1] = 0;
    }
    else if(players[id].pos[1] > height - playersize) {
        players[id].pos[1] = height - playersize;
    
	}
}
function collides(x, y, r, b, x2, y2, r2, b2) {
    return !(r <= x2 || x > r2 ||
             b <= y2 || y > b2);
}

function boxCollides(pos, size, pos2, size2) {
    return collides(pos[0], pos[1],
                    pos[0] + size[0], pos[1] + size[1],
                    pos2[0], pos2[1],
                    pos2[0] + size2[0], pos2[1] + size2[1]);
}
