"use strict";

// ## Player constants
var PLAYER_FIRE = 0;
var PLAYER_EARTH = 1;
var PLAYER_LIGHTNING = 2;
var PLAYER_WATER = 3;
var PLAYER_NAMES = ["Fae", "Elliot" , "Lex", "Wynne"];
var PLAYER_NAME_COLORS = ["orange", "brown" , "purple", "cyan"];
var PLAYER_CHARACTERS = ["character_fire", "character_earth" , "character_lightning", "character_water"];
var PLAYER_DEFAULT_MAXHEALTH = 50;
var PLAYER_DEFAULT_MAX_MANA = 50;
var PLAYER_DEFAULT_MANA_PER_SHOT = 15;
var PLAYER_DEFAULT_MANA_REGEN = 0.2;
var PLAYER_DEFAULT_DMG = 10;
var PLAYER_DEFAULT_CHARACTERID = 0; // fire
// ## Animation
var PLAYER_ANIMATION = "character";
var PLAYER_NO_FIRE_ANIMATION = "no_fire";
var PLAYER_FIRE_ANIMATION_TIME = 0.5; // seconds (NOT MILLISECONDS)
var PLAYER_STAND_ANIMATION_TIME = 0.5;
var PLAYER_TAKEDAMAGE_ANIMATION_TIME = 0.5;
var PLAYER_RUN_STILL_ANIMATION_TIME = 0.5;
var PLAYER_RUN_ANIMATION_TIME = 0.5;
var PLAYER_DEPTH = 10;

var PLAYER_DEFAULT_FIRING_COOLDOWN = PLAYER_FIRE_ANIMATION_TIME;
var PLAYER_DEFAULT_TAKE_DAMAGE_COOLDOWN = 0.5;
var PLAYER_DEFAULT_TOGGLE_ELEMENT_COOLDOWN = 0.1;

var MARGIN_BEFORE_DEATH_OUTSIDE_MAP = 800; // Margin outside the game map before the player's outOfBounds method is called

var SOUND_NOTENOUGHMANA = "manaInsufficient.ogg";

var time_fromFire;

// ## Player Sprite
// The very basic player sprite, this is just a normal sprite
// using the player sprite sheet with default controls added to it.
Q.Sprite.extend("Player",{

  // the init constructor is called on creation
  init: function(p, defaultP) {
    
    var that = this;
    p = Q._defaults(p, defaultP);

    // You can call the parent's constructor with this._super(..)
    this._super(p, {
      spriteId: -1,
      entityType: 'PLAYER',
      sprite: PLAYER_ANIMATION,
      x: 410,          
      y: 90,            
      cooldown: 0,    // can fire immediately
      canFire: true,
      isDead: false,
      maxHealth: PLAYER_DEFAULT_MAXHEALTH,
      currentHealth: PLAYER_DEFAULT_MAXHEALTH,
      maxMana: PLAYER_DEFAULT_MAX_MANA,
      currentMana: PLAYER_DEFAULT_MAX_MANA,
      manaPerShot: PLAYER_DEFAULT_MANA_PER_SHOT,
      dmg: PLAYER_DEFAULT_DMG,
      type: Q.SPRITE_ACTIVE,
      collisionMask: Q.SPRITE_ALL ^ Q.SPRITE_ACTIVE,
      characterId: PLAYER_DEFAULT_CHARACTERID,
      fireAnimation: PLAYER_NO_FIRE_ANIMATION,
      fireTargetX: 0, // position x of target in game world
      fireTargetY: 0,  // possition y of target in game world
      isFiring: false,
      isServerSide: false, // a flag so that the server-simulated players will send update messages out
      onLadder: false,
      ladderX: 0,
      takeDamageCooldown: 0,
      toggleElementCooldown: 0,
      firingCooldown: 0,
      update: true//,
      //updateCountdown: 1.0 // countdown before the client side uses the update from the server side, to reduce perceived lag
    });

    this.p.element = this.p.characterId;
    this.p.sheet = PLAYER_CHARACTERS[this.p.characterId];
    this.p.name = PLAYER_NAMES[this.p.characterId];
    this.p.z = PLAYER_DEPTH;
    
    // Add in pre-made components to get up and running quickly
    // The `2d` component adds in default 2d collision detection
    // and kinetics (velocity, gravity)
    // The `platformerControls` makes the player controllable by the
    // default input actions (left, right to move,  up or action to jump)
    // It also checks to make sure the player is on a horizontal surface before
    // letting them jump.
    this.add('2d, platformerControls, animation, healthBar, manaBar, nameBar, \
              dmgDisplay, healDisplay, feedbackDisplay, 2dLadder, powerupable, auraEffect');
    
    this.takeDamageIntervalId = -1;

    this.addEventListeners();
  },
  
  addEventListeners: function() { 
    this.on('fire');
    this.on('fired');
    this.on("onLadder", this, 'climbLadder');
  },

  fire: function(e){
    // console.log("At the START of FIRE function of PLAYER. properties of player: " + getJSON(this.p));
    
    if (this.p.firingCooldown <= 0) {
      if (!this.p.canFire) console.log("Setting canFire to true in fire");
      this.p.canFire = true;
      this.p.firingCooldown = 0;
    }
    
    //console.log("cooldown " + this.p.cooldown + " canFire " + this.p.canFire);
    if (this.p.isDead || !this.p.canFire) {
      return;
    }
    if (this.p.currentMana < this.p.manaPerShot) {
      // Play not enough mana sound
      Q.audio.play(SOUND_NOTENOUGHMANA);
      return;
    }
    time_fromFire = getCurrentTime();
    
    // Will be set to true in the fired function
    this.p.canFire = false;
    this.p.firingCooldown = PLAYER_DEFAULT_FIRING_COOLDOWN;
    
    // when fire event is trigger, x & y in the event data are translate into game world coordinates
    // during event handling in client socket
    var mouseX = e.x;
    var mouseY = e.y;
    this.p.fireTargetX = mouseX;
    this.p.fireTargetY = mouseY;

    // compute firing angle for animation
    var angleRad = Math.atan2(mouseY - this.p.y, mouseX - this.p.x) ;
    var angleDeg = -angleRad * 180 / Math.PI;

    if(angleDeg>0){
      angleDeg = 360 - angleDeg;
    }else{
      angleDeg = -angleDeg;
    }

    var animationName = "";
    if((angleDeg >=0 && angleDeg <=45) || (angleDeg <=360 && angleDeg>=315)){
      // shooting angle right
      animationName = "fire_right";
    }else if(angleDeg > 45 && angleDeg <= 135){
      // shooting angle down
      animationName = "fire_down";
    }else if(angleDeg > 135 && angleDeg <= 225){
      // shooting angle left
      animationName = "fire_left";
    }else{
      // shooting angle up
      animationName = "fire_up";
    }

    // cloning just in case of bad stuff happening due to references
    this.p.fireAnimation = animationName;

    if(this.has('animation')){
      this.play(animationName, 1);
    }else{
      this.trigger('fired');
    }
    
    // console.log("At the END of FIRE function of PLAYER. properties of player: " + getJSON(this.p));
  },

  fired: function(data){
    console.log("fired event triggered " + (getCurrentTime() - time_fromFire) + "ms after fire event was triggered");
    
    // fired will be triggered after the animation is over, so this is the time that the player can fire again
    this.p.canFire = true;
    
    if (typeof data === 'undefined') {
      // This makes calling 'fired' after being done with the 'fire' animation NOT WORK!!!
      // But necessary because server will calculate when to call this fired function anyway.
      // And we don't want the 'fire' animation to ALWAYS fire an eleball because of our
      // network architecture
      return;
    }
    
    if (this.p.isDead || this.p.currentMana < this.p.manaPerShot) {
      return;
    }
    
    var e = data.e;    
    
    //console.log("cooldown is " + this.p.cooldown);

    // when fire event is trigger, x & y in the event data are translate into game world coordinates
    // during event handling in client socket
    var mouseX = e.x;
    var mouseY = e.y;
    this.p.fireTargetX = mouseX;
    this.p.fireTargetY = mouseY;
    
    // reset fire animation
    this.p.fireAnimation = PLAYER_NO_FIRE_ANIMATION;
    //console.log("At the START of FIREDDDD function of PLAYER. properties of player: ");
    //console.log(getJSON(this.p));

    // Only on the server side do we insert this immediately.
    // On the client side we have to wait for the update message
    if (!this.p.isServerSide){
      return;
    }

    // re-compute firing angle with respect to current player position and target position
    var angleRad = Math.atan2(this.p.fireTargetY - this.p.y, this.p.fireTargetX - this.p.x) ;
    var angleDeg = -angleRad * 180 / Math.PI;

    if(angleDeg>0){
      angleDeg = 360 - angleDeg;
    }else{
      angleDeg = -angleDeg;
    }

    // Clone to avoid bad stuff from happening due to references
    var clonedProps = this.p;
    
    //this.p should not be circular
    //console.log("About to create PLAYERELEBALL with properties: " + getJSON(this.p));
    var eleballProperties = { isServerSide: clonedProps.isServerSide,
                              sessionId: clonedProps.sessionId,
                              element : clonedProps.element,
                              sheet : ELEBALL_ELEMENTNAMES[clonedProps.element],
                              shooter : clonedProps.name,
                              shooterId : clonedProps.spriteId,
                              dmg : this.p.dmg,
                              frame : ELEBALL_FRAME,
                              angle : angleDeg, // angle 0 starts from 3 o'clock then clockwise
                              vx : ELEBALL_DEFAULT_VX * Math.cos(angleRad),
                              vy : ELEBALL_DEFAULT_VY * Math.sin(angleRad)
    };

    var eleball = addPlayerEleballSprite(getNextSpriteId(), eleballProperties);

    // fire ball location offset from player
    var ballToPlayerY = Math.abs((clonedProps.h/2 + eleball.p.h/2) * Math.sin(angleRad)) * ELEBALL_PLAYER_SF;
    if(angleDeg <= 360 && angleDeg > 180){
      // deduct ball width due to the direction of the ball is set to be default at right direction
      eleball.p.y = clonedProps.y - ballToPlayerY;
    } else {
      eleball.p.y = clonedProps.y + ballToPlayerY;
    }

    var ballToPlayerX = Math.abs((clonedProps.w/2 + eleball.p.w/2) * Math.cos(angleRad)) * ELEBALL_PLAYER_SF;
    if(angleDeg <= 270 && angleDeg > 90){
      eleball.p.x = clonedProps.x - ballToPlayerX;
    } else {
      eleball.p.x = clonedProps.x + ballToPlayerX;
    }

    // console.log("New PLAYERELEBALL created with sessionId " + this.p.sessionId + " id " + eleball.p.spriteId);
    // console.log("Eleball added to stage, properties: " + getJSON(eleball.p));
    
    // server side broadcast to every player
    var eleballData = { entityType: 'PLAYERELEBALL',
                        spriteId: eleball.p.spriteId,
                        p: eleball.p
                      };

    Q.input.trigger('broadcastAll', {eventName:'addSprite', eventData: eleballData});

    //after eleball fired, decrease mana
    this.p.currentMana -= this.p.manaPerShot;
  },

  takeDamage: function(dmgAndShooter) {
    if(this.p.takeDamageCooldown > 0){
      return;
    }
  
    var that = this;
    if(this.takeDamageIntervalId == -1){
        var playTakeDamage = function (){
          that.play("take_damage", 3);
        }
        this.takeDamageIntervalId = setInterval(playTakeDamage, 150);
    }
    this.p.takeDamageCooldown = PLAYER_DEFAULT_TAKE_DAMAGE_COOLDOWN;

    var dmg = dmgAndShooter.dmg,
        shooterEntityType = dmgAndShooter.shooterEntityType,
        shooterId = dmgAndShooter.shooterSpriteId;
        
    // server side damage calculation
    if (this.p.isServerSide){
      
      this.p.currentHealth -= dmg;
      
      console.log(this.p.entityType + " " + this.p.spriteId + " took damage by " + shooterEntityType + 
                  " " + shooterId + ". currentHealth = " + this.p.currentHealth);

  
      Q.input.trigger('broadcastAll', {
        eventName: 'spriteTookDmg',
        eventData: {dmg: dmg,
                    victim: {entityType: this.p.entityType, spriteId: this.p.spriteId},
                    shooter: {entityType: shooterEntityType, spriteId: shooterId}
                  }
      });


      // Only the server decides if the player dies or not
      if(this.p.currentHealth <= 0) {
        this.die(shooterEntityType, shooterId);
      }
    }
    
    // Mainly for the dmgDisplay
    this.trigger('takeDamage', {dmg: dmg, shooterEntityType: shooterEntityType, shooterSpriteId: shooterId});
  },
  
  heal: function(healAmt) {
    var diff = this.p.maxHealth - this.p.currentHealth;
    healAmt = Math.min(diff, healAmt);
    this.p.currentHealth += healAmt;
    this.trigger('heal', healAmt);
  },
  
  die: function(killerEntityType, killerId) {
    this.p.isDead = true;

    var killerName = getSprite(killerEntityType, killerId).p.name;
    
    var vType = this.p.entityType;
    var vId = this.p.spriteId;
    var vCharId = this.p.characterId;
    var vSessionId = this.p.sessionId;


    console.log(this.p.name + " died to " + killerName);
  
    if (this.p.isServerSide) {
      
      Q.state.trigger("playerDied", {
        victim: {entityType: vType, spriteId: vId}, 
        killer: {entityType: killerEntityType, spriteId: killerId}
      });
    
      Q.input.trigger('broadcastAll', {eventName: 'spriteDied', eventData: {
        victim: {entityType: vType, spriteId: vId}, 
        killer: {entityType: killerEntityType, spriteId: killerId}
      }});

      // session show player killed info
      var msg = vType+" "+vId+" '"+getSprite(vType,vId).p.name+"' "+
            "just got killed by "+killerEntityType+" "+killerId+" '"+killerName+"'";
      Q.stageScene(SCENE_INFO, STAGE_INFO, {msg: msg});  

    } else{

      // player side shows its death
      msg = "You are killed by "+killerName;
      Q.stageScene(SCENE_INFO, STAGE_INFO, {msg: msg, countdown: 5, countdownMsg: "Respawning in"});

      // client side trigger respan event
      setTimeout(function(){
        Q.input.trigger('respawn', {sessionId: vSessionId, spriteId: vId, characterId: vCharId});
      }, 5000);
    }

    removePlayerSprite(vId);
  },
  
  outOfBounds: function() {
    this.p.isDead = true;
    
    var vType = this.p.entityType;
    var vId = this.p.spriteId;
    var vCharId = this.p.characterId;
    var vSessionId = this.p.sessionId;

    console.log(this.p.name + " went out of bounds of the game map!");
  
    if (this.p.isServerSide) {
      
      Q.state.trigger("playerDied", {
        victim: {entityType: vType, spriteId: vId}
      });
    
      Q.input.trigger('broadcastAll', {eventName: 'spriteOutOfBounds', eventData: {
        victim: {entityType: vType, spriteId: vId}
      }});

      // session show player out of bounds info
      var msg = vType+" "+vId+" '"+getSprite(vType,vId).p.name+"' "+
            "went out of bounds!";
      Q.stageScene(SCENE_INFO, STAGE_INFO, {msg: msg});  

    } else{

      // player side shows its death
      msg = "You went out of bounds!";
      Q.stageScene(SCENE_INFO, STAGE_INFO, {msg: msg, countdown: 5, countdownMsg: "Respawning in"});

      // client side trigger respan event
      setTimeout(function(){
        Q.input.trigger('respawn', {sessionId: vSessionId, spriteId: vId, characterId: vCharId});
      }, 5000);
    }

    removePlayerSprite(vId);
  },

  step: function(dt) {
    // kill the player if he goes out of the map
    var tileLayer = Q.stage(STAGE_LEVEL)._collisionLayers[0];
    var gameWorldWidth = tileLayer.p.w;
    var gameWorldHeight = tileLayer.p.h;
    if (this.p.isServerSide && this.p.x < -MARGIN_BEFORE_DEATH_OUTSIDE_MAP || this.p.x > gameWorldWidth + MARGIN_BEFORE_DEATH_OUTSIDE_MAP ||
        this.p.y < -MARGIN_BEFORE_DEATH_OUTSIDE_MAP || this.p.y > gameWorldHeight + MARGIN_BEFORE_DEATH_OUTSIDE_MAP) {
      this.outOfBounds();
      return;
    }
    
    // stop interval when player can take damage
    if(this.p.takeDamageCooldown <= 0 && this.takeDamageIntervalId != -1){
      clearInterval(this.takeDamageIntervalId);
      this.takeDamageIntervalId = -1;
    }
    
    this.p.firingCooldown -= dt;
  
    // Update countdown
    //this.p.updateCountdown -= dt;
    
    if(this.p.onLadder && (this.p.landed < 0 || Q.inputs['up'])) {
      this.p.gravity = 0;
      if( !this.p.isServerSide && Q.inputs['up']) {
        if (this.p.vx > 0) {
          this.p.vx = Math.sqrt(this.p.speed*this.p.speed/2); // diagonal speed should be equal to absolute speed
          this.p.vy = -Math.sqrt(this.p.speed*this.p.speed/2);
        } else if (this.p.vx < 0) {
          this.p.vx = -Math.sqrt(this.p.speed*this.p.speed/2);
          this.p.vy = -Math.sqrt(this.p.speed*this.p.speed/2);
        } else {
          this.p.vy = -this.p.speed; // only going upwards, so vy is the absolute speed
        }
        this.play("run_in");
      } else if( !this.p.isServerSide && Q.inputs['down']) {
        if (this.p.vx > 0) {
          this.p.vx = Math.sqrt(this.p.speed*this.p.speed/2); // diagonal speed should be equal to absolute speed
          this.p.vy = Math.sqrt(this.p.speed*this.p.speed/2);
        } else if (this.p.vx < 0) {
          this.p.vx = -Math.sqrt(this.p.speed*this.p.speed/2);
          this.p.vy = Math.sqrt(this.p.speed*this.p.speed/2);
        } else {
          this.p.vy = this.p.speed; // only going downwards, so vy is the absolute speed
        }
        this.play("run_in");
      } else{
        this.p.vy = 0;
        this.play("stand_back");
      }
    }else{
      this.p.gravity = 1;
      if(this.has('animation')){
        // player not jumping
        if(this.p.vy == 0){
          // play running animation
          if (this.p.vx > 0) {
            this.play("run_right");
          } else if (this.p.vx < 0) {
            this.play("run_left");
          } else {
            this.play("stand_front");
          }
        }else{
          // player is jumping
          // play the still frame where the direction is
          if (this.p.vx > 0) {
            this.play("run_right_still");
          } else if (this.p.vx < 0) {
            this.play("run_left_still");
          }
          else {
            this.play("stand_front");
          }
        }
      }
    }
    
    
    this.p.onLadder = false;
    
    this.p.takeDamageCooldown = Math.max(this.p.takeDamageCooldown - dt, 0);
    this.p.toggleElementCooldown = Math.max(this.p.toggleElementCooldown - dt, 0);

    if (this.p.currentMana < this.p.maxMana) {
      this.p.currentMana += PLAYER_DEFAULT_MANA_REGEN;
    }
  }

});

Q.animations(PLAYER_ANIMATION, {
  run_in: { frames: [7,8,9,10,11,12], rate: PLAYER_RUN_ANIMATION_TIME/6}, 
  run_left: { frames: [20,21,22,23,24,25], rate:PLAYER_RUN_ANIMATION_TIME/6 },
  run_out: { frames: [33,34,35,36,37,38], rate:PLAYER_RUN_ANIMATION_TIME/6 },
  run_right: { frames: [46,47,48,49,50,51], rate: PLAYER_RUN_ANIMATION_TIME/6}, 
  
  run_left_still: { frames: [22], rate: PLAYER_RUN_STILL_ANIMATION_TIME/3 },
  run_right_still: { frames: [47], rate: PLAYER_RUN_STILL_ANIMATION_TIME/3}, 

  fire_up: { frames: [51,52,53,54,55,56,57,58,59,60,61,62,63], rate: PLAYER_FIRE_ANIMATION_TIME/13, trigger: "fired", loop: false},
  fire_left: { frames: [64,65,66,67,68,69,70,71,72,73,74,75,76], rate: PLAYER_FIRE_ANIMATION_TIME/13, trigger: "fired", loop: false}, 
  fire_down: { frames: [77,78,79,80,81,82,83,84,85,86,87,88,89], rate: PLAYER_FIRE_ANIMATION_TIME/13, trigger: "fired", loop: false}, 
  fire_right: { frames: [90,91,92,93,94,95,96,97,98,99,100,101,102,103], rate: PLAYER_FIRE_ANIMATION_TIME/13, trigger: "fired", loop: false}, 

  take_damage: {frames: [104], rate: PLAYER_TAKEDAMAGE_ANIMATION_TIME/3, loop:false},

  stand_back: { frames: [7], rate: PLAYER_STAND_ANIMATION_TIME/3 },
  stand_left: { frames: [20], rate: PLAYER_STAND_ANIMATION_TIME/3 },
  stand_front: { frames: [33], rate: PLAYER_STAND_ANIMATION_TIME/3 },
  stand_right: { frames: [46], rate: PLAYER_STAND_ANIMATION_TIME/3 }
});
