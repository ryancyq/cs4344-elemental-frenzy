"use strict";

// ## Game State

var resetState = function(newState){

  console.log("Q.state reset");

  if(newState){
    // client reset
    Q.state.reset(newState);
  }else{
    // session reset
    Q.state.reset({
      kills : {},
      deaths : {},
      playerPermanentBoosts : {}, // indexed by id, and then things like dmg, maxHealth, maxMana
      totalTime : 0,  // total time for a round in seconds (should not change for each round)
      timeLeft : 0    // time left for a round in seconds
    });
  }

  var addNewPlayerToState = function(playerId) {
    var playerSprite = getPlayerSprite(playerId);
    if (typeof playerSprite === 'undefined') {
      console.log("Error in event in addNewPlayerToState(): player " + playerId + " is undefined");
      return;
    }
    var newState = {
      kills: Q.state.get('kills'),
      deaths: Q.state.get('deaths'),
      playerPermanentBoosts : Q.state.get('playerPermanentBoosts')
    }
    newState.kills[playerSprite.p.name] = newState.deaths[playerSprite.p.name] = 0;
    newState.playerPermanentBoosts[playerSprite.p.spriteId] = {dmg: 0, maxHealth: 0, maxMana: 0, stacks: {}};
    Q.state.set(newState);
  }

  // # Set listeners for the game state
  // # When a new player joins, add it to the gamestate with 0 kills 0 deaths
  Q.state.on('playerJoined', function(playerId) {
    console.log("Gamestate playerJoined event triggered");
    addNewPlayerToState(playerId);
  });

  // # When player dies, update the kills of the killer and the deaths of the victim
  Q.state.on("playerDied", function(data) {
    console.log("Gamestate playerDied event triggered");
    var victimEntityType = data.victim.entityType,
        victimId = data.victim.spriteId;
    if (data.killer) {
      // Normal case where a player kills another player or an enemy killed a player
      var killerEntityType = data.killer.entityType;
      var killerId = data.killer.spriteId;
          
      if (killerEntityType == 'PLAYER') {
        // Case where a player killed the player
        // Might be actors on the client side
        victimEntityType = (victimEntityType == 'PLAYER' && typeof selfId != 'undefined' && victimId != selfId) ? 'ACTOR' : victimEntityType;
        killerEntityType = (killerEntityType == 'PLAYER' && typeof selfId != 'undefined' && killerId != selfId) ? 'ACTOR' : killerEntityType;
        
        var victimName = getSprite(victimEntityType, victimId).p.name,
            killerName = getSprite(killerEntityType, killerId).p.name;
        console.log("State log: victim " + victimName + " killer " + killerName);
        
        var kills = Q.state.get('kills');
        var deaths = Q.state.get('deaths');
        
        if (typeof kills[killerName] === 'undefined') {
          console.log("Error in gamestate event playerDied: kills[" + killerName + "] is undefined");
          return;
        }
        if (typeof deaths[victimName] === 'undefined') {
          console.log("Error in gamestate event playerDied: deaths[" + victimName + "] is undefined");
          return;
        }
        
        kills[killerName]++;
        deaths[victimName]++;
        Q.state.set({kills: kills, deaths: deaths});

        console.log("Kills for player " + killerName + " is " + Q.state.get('kills')[killerName]);
        console.log("Deaths for player " + victimName + " is " + Q.state.get('deaths')[victimName]);

        //update scoreboard if it is open, and if it is not on server
        if (!(typeof Q.stage(STAGE_SCORE) === 'undefined' || Q.stage(STAGE_SCORE) === null) &&
            !isSession) {
          Q.clearStage(STAGE_SCORE);
          Q.stageScene(SCENE_SCORE, STAGE_SCORE); 
        }
      } else {
        // Case where an enemy killed the player
        // Might be actors on the client side
        victimEntityType = (victimEntityType == 'PLAYER' && typeof selfId != 'undefined' && victimId != selfId) ? 'ACTOR' : victimEntityType;
        
        var victimName = getSprite(victimEntityType, victimId).p.name,
            killerName = getSprite(killerEntityType, killerId).p.name;
        console.log("State log: victim " + victimName + " killer " + killerName);
        
        // Only increase player deaths
        var deaths = Q.state.get('deaths');
        
        if (typeof deaths[victimName] === 'undefined') {
          console.log("Error in gamestate event playerDied: deaths[" + victimName + "] is undefined");
          return;
        }
        
        deaths[victimName]++;
        Q.state.set({deaths: deaths});

        console.log("Deaths for player " + victimName + " is " + Q.state.get('deaths')[victimName]);

        //update scoreboard if it is open, and if it is not on server
        if (!(typeof Q.stage(STAGE_SCORE) === 'undefined' || Q.stage(STAGE_SCORE) === null) &&
            !isSession) {
          Q.clearStage(STAGE_SCORE);
          Q.stageScene(SCENE_SCORE, STAGE_SCORE); 
        }
      }
    } else {
      // Special case where the player went out of bounds
      // Might be an actor on the client side
      victimEntityType = (victimEntityType == 'PLAYER' && typeof selfId != 'undefined' && victimId != selfId) ? 'ACTOR' : victimEntityType;
      var victimName = getSprite(victimEntityType, victimId).p.name;
      console.log("State log: victim " + victimName + "went out of bounds and got 1 death");
      
      var deaths = Q.state.get('deaths');
      
      if (typeof deaths[victimName] === 'undefined') {
        console.log("Error in gamestate event playerDied: deaths[" + victimName + "] is undefined");
        return;
      }
      
      deaths[victimName]++;
      Q.state.set({deaths: deaths});

      console.log("Deaths for suicidal (out of bounds) player " + victimName + " is " + Q.state.get('deaths')[victimName]);

      //update scoreboard if it is open, and if it is not on server
      if (!(typeof Q.stage(STAGE_SCORE) === 'undefined' || Q.stage(STAGE_SCORE) === null) &&
          !isSession) {
        Q.clearStage(STAGE_SCORE);
        Q.stageScene(SCENE_SCORE, STAGE_SCORE); 
      }
    }
    
  });

  // # When player disconnects, remove it from the gamestate
  Q.state.on('playerDisconnected', function(playerName) {
    console.log("Gamestate playerDisconnected event triggered");
    if (typeof playerName === 'undefined') {
      console.log("Error in event in gamestate: playerDisconnected: player name is undefined");
      return;
    }
    var newState = {
      kills: Q.state.get('kills'),
      deaths: Q.state.get('deaths')
    }
    delete newState.kills[playerName];
    delete newState.deaths[playerName];
    Q.state.set(newState);
  });

  // # When enemy dies, update the kills of the killer only
  Q.state.on("enemyDied", function(killer) {
    console.log("Gamestate enemyDied event triggered");
    if (!killer) {
      console.log("Error in gamestate event enemyDied: killer is undefined");
      return;
    }
    
    var killerEntityType = killer.entityType;
    var killerId = killer.spriteId;
        
    // Might be actors on the client side
    killerEntityType = (killerEntityType == 'PLAYER' && typeof selfId != 'undefined' && killerId != selfId) ? 'ACTOR' : killerEntityType;
    
    var killerName = getSprite(killerEntityType, killerId).p.name;
    console.log("State log: an enemy-ai was killed by " + killerName);
    
    var kills = Q.state.get('kills');
    
    if (typeof kills[killerName] === 'undefined') {
      console.log("Error in gamestate event playerDied: kills[" + killerName + "] is undefined");
      return;
    }
    
    kills[killerName]++;
    Q.state.set({kills: kills});

    console.log("Kills for player " + killerName + " is " + Q.state.get('kills')[killerName]);

    //update scoreboard if it is open, and if it is not on server
    if (!(typeof Q.stage(STAGE_SCORE) === 'undefined' || Q.stage(STAGE_SCORE) === null) &&
        !isSession) {
      Q.clearStage(STAGE_SCORE);
      Q.stageScene(SCENE_SCORE, STAGE_SCORE); 
    }
  });
  
  Q.state.on('playerStatBoost', function(data) {
    var spriteId = data.spriteId;
    var boosts = Q.state.get('playerPermanentBoosts');
    console.log("adding dmg from " + boosts[spriteId].dmg + " to " + (boosts[spriteId].dmg+data.dmg));
    if (typeof boosts[spriteId].stacks[data.powerupName] === 'undefined') {
      boosts[spriteId].stacks[data.powerupName] = 0;
    } 
    if (boosts[spriteId].stacks[data.powerupName] < data.maxStacksAllowed) {
      boosts[spriteId].stacks[data.powerupName]++;
      boosts[spriteId].dmg       += data.dmg;
      boosts[spriteId].maxHealth += data.maxHealth;
      boosts[spriteId].maxMana   += data.maxMana;
      Q.state.set({playerPermanentBoosts: boosts});
    }
  });

  Q.state.on('change', function() {
    Q.input.trigger('stateChanged');
  });
}