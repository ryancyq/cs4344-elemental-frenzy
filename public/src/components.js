"use strict";

// ## Healthbar constants
var HEALTHBAR_WIDTH_SF = 1.5;
var HEALTHBAR_HEIGHT_SF = 0.2;
var HEALTHBAR_HEIGHT_OFFSET = 9.0;

// ## manaBar constants
var MANABAR_WIDTH_SF = 1.5;
var MANABAR_HEIGHT_SF = 0.2;
var MANABAR_HEIGHT_OFFSET = 2.0;

// ## localPerceptionFilter constants
var LPF_TOTALTIME = 0.5; // in seconds

var updateInterval = 100;

// ## Healthbar component to be attached to an entity with currentHealth and maxHealth
// Usage:
//  1. Ensure the entity it is attached to has a p.currentHealth and p.maxHealth property,
//  2. then call the draw(ctx) method of the healthBar in the draw method of the entity.
Q.component("healthBar", {
  added: function() {
    this.entity.on('draw', this, 'draw');
  },
  
  draw: function(ctx) {
    var color = '#FF0000'; // defaults to red
    if (this.entity.isA('Player')) {
      color = 'lime'; // player healthbar is green
    }
    var hf = this.entity.p.currentHealth / this.entity.p.maxHealth;
    if (this.entity.isA('Player') && hf <= 0.5) {
      color = 'yellow';
      if (hf <= 0.25) {
        color = 'brown';
      }
    }
    var width = this.entity.p.w * HEALTHBAR_WIDTH_SF;
    var height = this.entity.p.h * HEALTHBAR_HEIGHT_SF;
    ctx.fillStyle = color;
    ctx.fillRect(-width/2, -this.entity.p.cy - height - HEALTHBAR_HEIGHT_OFFSET,
          width * hf, height);
    ctx.fillStyle = "black";
    ctx.strokeRect(-width/2, -this.entity.p.cy - height - HEALTHBAR_HEIGHT_OFFSET,
          width, height);
  }
});

// ## Manabar component to be attached to an entity with currentMana and maxMana
// Usage:
//  1. Ensure the entity it is attached to has a p.currentMana and p.maxMana property,
//  2. then call the draw(ctx) method of the manaBar in the draw method of the entity.
Q.component("manaBar", {
  added: function() {
    this.entity.on('draw', this, 'draw');
  },
  
  draw: function(ctx) {
    var color = '#FF00FF'; // defaults to purple
    if (this.entity.isA('Player')) {
      color = this.entity.p.currentMana > this.entity.p.manaPerShot ? '#1589FF' : 'blue'; // player manaBar is light blue
    }
    var mf = this.entity.p.currentMana / this.entity.p.maxMana;
    
    var width = this.entity.p.w * MANABAR_WIDTH_SF;
    var height = this.entity.p.h * MANABAR_HEIGHT_SF;
    ctx.fillStyle = color;
    ctx.fillRect(-width/2, -this.entity.p.cy - height - MANABAR_HEIGHT_OFFSET,
          width * mf, height);
    ctx.fillStyle = "black";
    ctx.strokeRect(-width/2, -this.entity.p.cy - height - MANABAR_HEIGHT_OFFSET,
          width, height);

    var widthOfOneShot = this.entity.p.manaPerShot / this.entity.p.maxMana * width;
    var numPossibleShots = Math.floor(this.entity.p.maxMana / this.entity.p.manaPerShot);
    for (var i = 0; i < numPossibleShots; i++) {
      ctx.strokeRect(-width/2 + i * widthOfOneShot, -this.entity.p.cy - height - MANABAR_HEIGHT_OFFSET,
          widthOfOneShot, height);  }
    }
    
});

// ## Namebar component to be attached to a player/actor which displays their name above them
// Usage:
//  1. Ensure the entity it is attached to has a p.name property,
//  2. then call the draw(ctx) method of the nameBar in the draw method of the entity.
Q.component("nameBar", {
  added: function() {
    this.entity.on('draw', this, 'draw');
  },
  
  draw: function(ctx) {
    ctx.save();

    var entity = this.entity;
    var y = -entity.p.cy - 20;
    var name = this.entity.p.name;
    var color = 'dimgrey'; 

    if (this.entity.isA('Player')) {
      color = 'navy';
    }else if(this.entity.isA('Enemy')){
      color = 'crimson';
      name = "[BOSS] "+name;
    }

    ctx.font = "600 15px "+FONT_FAMILY;
    ctx.textAlign = "center";
    ctx.fillStyle = color || "black";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(name, 0, y);

    ctx.restore();
  }
});

// ## feedbackDisplay component to be attached to a sprite which displays text feedback
// Usage:
//  1. Call the displayFeedback function of the sprite to add a text, [fontcolor], [fontsize in px], [font family] to the buffer
//  2. Call the step(dt) function in the step function of the entity.
//  3. Call the draw(ctx) function in the draw function of the entity.
Q.component("feedbackDisplay", {
  added: function() {
    this.feedbackList = [];           // feedback to be displayed
    this.feedbackTimeLeftList = [];   // timeLeft for each feedback to be displayed
    this.feedbackDisplayPosList = []; // positions x and y of the display for each damage
    this.feedbackDisplayVx = 0;       // 
    this.feedbackDisplayVy = -1.5;      // velocities for the display
    this.feedbackMinDistApart = 20;   // Text must be displayed this far apart at least
    
    this.entity.on('draw', this, 'draw');
    this.entity.on('step', this, 'step');
  },
  
  step: function(dt) {
    for (var i = 0; i < this.feedbackTimeLeftList.length; i++) {
      this.feedbackTimeLeftList[i] -= dt;
      if (this.feedbackTimeLeftList[i] <= 0) {
        // No need to display anymore, so remove it
        this.feedbackTimeLeftList.splice(i, 1);
        this.feedbackList.splice(i, 1);
        this.feedbackDisplayPosList.splice(i, 1);
      } else {
        // Need to display, so shift by vx, vy
        var vx = this.feedbackList[i].options.displayVx;
        var vy = this.feedbackList[i].options.displayVy;
        this.feedbackDisplayPosList[i][0] += vx;
        this.feedbackDisplayPosList[i][1] += vy;
      }
    }
  },
  
  draw: function(ctx) {
    for (var i = 0; i < this.feedbackList.length; i++) {
      var feedback = this.feedbackList[i].text;
      var options = this.feedbackList[i].options;
      ctx.font = options.fontSize + "px " + options.fontFamily;
      ctx.textAlign = options.textAlign;
      ctx.fillStyle = options.fillStyle;
      ctx.fillText(feedback, 
            this.feedbackDisplayPosList[i][0], this.feedbackDisplayPosList[i][1]);
    }
  },
  
  extend: {
    /**
     * Can specify options for the text:
     * 1. fillStyle - color (e.g. 'black')
     * 2. fontSize - font size (e.g. 20)
     * 3. fontFamily - font family (e.g. FONT_FAMILY)
     * 4. textAlign - text alignment (e.g. 'left')
     * 5. displayTime - how long to display, in seconds (e.g. 2)
     * 6. displayVx - how fast horizontally should it move (e.g. 5)
     * 7. displayVy - how fast vertically should it move (e.g. 5)
     * 8. offset - how far away from the center of the entity attached to, horizontally, should it be displayed at (e.g. 10)
     */
    displayFeedback: function(text, options) {
      // No text, don't bother doing anything
      if (!text) {
        return;
      }
      
      options = options || {};
      Q._defaults(options, {
        fillStyle: 'black',
        fontSize: 20,
        fontFamily: FONT_FAMILY,
        textAlign: 'left',
        displayTime: 2, // in seconds
        displayVx: this.feedbackDisplay.feedbackDisplayVx,
        displayVy: this.feedbackDisplay.feedbackDisplayVy,
        offset: 10 // the offset of the text from the center of the sprite
      });
      
      // Adds the feedback into the buffer
      var feedbackDisplay = this.feedbackDisplay;
      feedbackDisplay.feedbackList.push({text: text, options: options});
      feedbackDisplay.feedbackTimeLeftList.push(options.displayTime); 
      
      // Calculate the starting x and y position of the text and then insert it
      var x = this.p.cx + options.offset;
      var y = 0;
      var sizeOfFeedbackDisplay = feedbackDisplay.feedbackDisplayPosList.length;
      if (sizeOfFeedbackDisplay > 0) {
        var prevTextY = feedbackDisplay.feedbackDisplayPosList[sizeOfFeedbackDisplay-1][1];
        if (y - prevTextY < feedbackDisplay.feedbackMinDistApart) { // text is floating up, so prevTextY is smaller
          // Need to increase the space between this new text and the previous text being displayed
          y = prevTextY + feedbackDisplay.feedbackMinDistApart;
        }
      }
      feedbackDisplay.feedbackDisplayPosList.push([x, y]);
    }
  }
});

Q.component("healDisplay", {
  added: function() {
    var entity = this.entity;
    entity.on('heal', this, 'showHealFeedback');
  },
  
  showHealFeedback: function(healAmt) {
    var entity = this.entity;
    if (!entity.has('feedbackDisplay')) {
      entity.add('feedbackDisplay');
    }
    entity.displayFeedback("+" + healAmt, {
      fillStyle: '#00B000'
    });
  }
});

// ## DmgDisplay component to be attached to a sprite which displays the damages they take
// Usage:
//  1. Call the showDmgFeedback(dmg) function when damage is taken to add the dmg to the display buffer
//  2. Call the step(dt) function in the step function of the entity.
//  3. Call the draw(ctx) function in the draw function of the entity.
Q.component("dmgDisplay", {
  added: function() {
    var entity = this.entity;
    entity.on('takeDamage', this, 'showDmgFeedback');
  },
  
  showDmgFeedback: function(dmgAndShooter) {
    var dmg = dmgAndShooter.dmg;
    var entity = this.entity;
    if (!entity.has('feedbackDisplay')) {
      entity.add('feedbackDisplay');
    }
    entity.displayFeedback("-" + dmg, {
      fillStyle: 'red'
    });    
  }
});

// Implements a local perception filter using 4 variables:
// 1. lpfNeededX - (unchanging) the total extra distance in the x-axis that needs to be covered
// 2. lpfNeededY - (unchanging) the total extra distance in the y-axis that needs to be covered
// 3. lpfTimeLeft - (starts at LPF_TOTALTIME and decreases to 0) amount of time left to finish travelling the extra distance needed
// 4. lpfTotalTime - (constant) total amount of time to perform the local perception filter
Q.component('localPerceptionFilter', {
  added: function() {
    var entity = this.entity;
    Q._defaults(entity.p, {
      lpfNeededX: 0,
      lpfNeededY: 0,
      lpfTimeLeft: LPF_TOTALTIME,
      lpfTotalTime: LPF_TOTALTIME
    });
    entity.on('step', this, "step");
  },
  
  step: function(dt) {
    var entity = this.entity;
    if (entity.p.lpfTimeLeft > 0) {
      
      var multiplier = 1.0/entity.p.lpfTotalTime;
      var t = Math.min(entity.p.lpfTimeLeft, dt);
      entity.p.lpfTimeLeft -= t;
      
      var dx = entity.p.lpfNeededX * t * multiplier;
      var dy = entity.p.lpfNeededY * t * multiplier;
      
      entity.p.x += dx;
      entity.p.y += dy;
    } else {
      entity.p.lpfTimeLeft = 0;
    }
  }
});

// ## 2dEleball component that is an extension of the '2d' component provided by Quintus (in Quintus_2d.js)
//   Modifies what happens on collision with another eleball
Q.component('2dEleball', {
  added: function() {
    var entity = this.entity;
    Q._defaults(entity.p,{
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      gravity: 0, // Eleballs have no gravity
      type: Q.SPRITE_PARTICLE, // Eleballs are particles
      collisionMask: Q.SPRITE_ALL 
                      ^ Q.SPRITE_POWERUP 
                      ^ Q.SPRITE_PASSIVE, // Eleballs collide with anything except powerups and passive things like ladders
      sensor: true
    });
    entity.on('step',this,"step");
    entity.on('hit',this,"collision");
  },

  // Eleballs get destroyed when touching things, and may play a sound if soundIsAnnoying is set to false
  // Eleballs may also cancel out fireballs
  // Eleball elements and their indices:
  // [0: fire, 1: earth, 2: lightning, 3: water]
  // Logic for eleball collision:
  //  - Case 1: Both gets destroyed if their elements are the same
  //  - Case 2: this element of index i destroys the other element of index j
  //        and continues on its path if (j-i) == 1 or (i-j) == (numElements-1)
  //  - Case 3: Both elements pass through each other if |i-j| == 2
  collision: function(col,last) {    
    var entity = this.entity;
    var other = col.obj;
    
    // Don't collide with the shooter of the eleball (for PlayerEleball)
    if ( entity.isA('PlayerEleball') && (other.isA('Actor') || other.isA('Player')) && other.p.spriteId == entity.p.shooterId ){
      // console.log("Eleball passing object!!!");
      return;
    }
    
    // Don't collide with enemies for EnemyEleball
    if ( entity.isA('EnemyEleball') && other.isA('Enemy') ){
      // console.log("Eleball passing object!!!");
      return;
    }
    
    // Don't collide with powerups and ladders
    if (other.isA('Powerup') || other.isA('Ladder')) {
      return;
    }
    
    // Don't destroy eleballs on hit with enemy players if we are NOT the server (only the server decides this)
    if ( !entity.p.isServerSide && other.isA('Actor') ) {
      return;
    }
    
    if (other.has("2dEleball")) {
      // Eleball - eleball collision
      //console.log("Eleball-eleball collision");
      var i = entity.p.element,
        j = other.p.element;
      //console.log("i = " + i + " j = " + j);
      if (i == j) {
        // Case 1, destroy each other
        //console.log("Case 1, " + ELEBALL_ELEMENTNAMES[i] 
        //      + " destroys and gets destroyed by " + ELEBALL_ELEMENTNAMES[j]);

        removeSprite(entity.p.entityType, entity.p.spriteId);
        
        // Play sound
        if ( !entity.p.soundIsAnnoying) {
          Q.audio.play(ELEBALL_ELEMENTSOUNDS[i]);
        }
      } else if ( (j-i == 1) || (j-i == 1-ELEBALL_ELEMENTNAMES.length) ){
        // Case 2, this eleball destroys the other and passes through
        //console.log("Case 2, " + ELEBALL_ELEMENTNAMES[i] 
        //      + " destroys " + ELEBALL_ELEMENTNAMES[j]);
        
        removeSprite(other.p.entityType, other.p.spriteId);

        // Play sound
        if ( !other.p.soundIsAnnoying) {
          Q.audio.play(ELEBALL_ELEMENTSOUNDS[j]);
        }
      } else if (Math.abs(i-j) == 2) {
        //console.log("Case 3, " + ELEBALL_ELEMENTNAMES[i] 
        //      + " passes through " + ELEBALL_ELEMENTNAMES[j]);
      }
      entity.trigger("onHit", col);
    } else {
      //console.log("In 2dEleball: triggering onHit");
      entity.trigger("onHit", col);

      removeSprite(entity.p.entityType, entity.p.spriteId);
    }
  },

  step: function(dt) {
    var p = this.entity.p,
    dtStep = dt;
    
    // If eleball goes out of the game world too far, destroy it immediately
    var tileLayer = Q.stage(STAGE_LEVEL)._collisionLayers[0];
    var gameWorldWidth = tileLayer.p.w;
    var gameWorldHeight = tileLayer.p.h;
    var MARGIN_OUTOFBOUNDS = 500;
    if (p.x < -MARGIN_OUTOFBOUNDS || p.y < -MARGIN_OUTOFBOUNDS ||
        p.x > (gameWorldWidth + MARGIN_OUTOFBOUNDS) || p.y > (gameWorldHeight + MARGIN_OUTOFBOUNDS) ) {
      //console.log("Removing eleball because it exceeded gameworld bounds");
      removeSprite(p.entityType, p.spriteId);
    }
    
    // TODO: check the entity's magnitude of vx and vy,
    // reduce the max dtStep if necessary to prevent
    // skipping through objects.
    while(dtStep > 0) {
      dt = Math.min(1/30,dtStep);
      // Updated based on the velocity and acceleration
      p.vx += p.ax * dt + (p.gravityX === void 0 ? Q.gravityX : p.gravityX) * dt * p.gravity;
      p.vy += p.ay * dt + (p.gravityY === void 0 ? Q.gravityY : p.gravityY) * dt * p.gravity;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      this.entity.stage.collide(this.entity, {maxCol: 1});
      dtStep -= dt;
    }
  }
});

// ## Attach to server side entities for them to send updates at a regular interval
Q.component("serverSprite", {
  added: function() {
    var that = this.entity;
    
    that.p.isServerSide = true;
    
    // Server side sprites will send updates periodically
    this.serverUpdateInterval = setInterval(function() {    
      // console.log("EntityType " + entity.p.entityType + " id " + entity.p.spriteId + " in session "+entity.p.sessionId+" sending update from server");
      
      Q.input.trigger('broadcastAll', {eventName:'updateSprite', eventData: {p: cloneValueOnly(that.p)} });
    }, updateInterval);
    
    that.on('destroyed', this, 'destroy');
  },
  
  destroy: function() {
    console.log("Destroying server side updating interval");
    clearInterval(this.serverUpdateInterval);
  }
});

// ## Attached to players on the server side for simulation
Q.component("serverPlatformerControls", {
  defaults: {
    speed: 200,
    jumpSpeed: -300,
    collisions: []
  },

  added: function() {
    var p = this.entity.p;
  
    this.entity.inputs = [];

    Q._defaults(p,this.defaults);

    this.entity.on("step",this,"step");
    this.entity.on("bump.bottom",this,"landed");

    p.landed = 0;
    p.direction ='right';
  },

  landed: function(col) {
    var p = this.entity.p;
    p.landed = 1/5;
  },

  step: function(dt) {
    var p = this.entity.p;
  
    if(p.ignoreControls === undefined || !p.ignoreControls) {
      var collision = null;

      // Follow along the current slope, if possible.
      if(p.collisions !== undefined && p.collisions.length > 0 && (this.entity.inputs['left'] || this.entity.inputs['right'] || p.landed > 0)) {
        if(p.collisions.length === 1) {
          collision = p.collisions[0];
        } else {
          // If there's more than one possible slope, follow slope with negative Y normal
          collision = null;

          for(var i = 0; i < p.collisions.length; i++) {
            if(p.collisions[i].normalY < 0) {
              collision = p.collisions[i];
            }
          }
        }

        // Don't climb up walls.
        if(collision !== null && collision.normalY > -0.3 && collision.normalY < 0.3) {
          collision = null;
        }
      }

      if(this.entity.inputs['left']) {
        p.direction = 'left';
        if(collision && p.landed > 0) {
          p.vx = p.speed * collision.normalY;
          p.vy = -p.speed * collision.normalX;
        } else {
          p.vx = -p.speed;
        }
      } else if(this.entity.inputs['right']) {
        p.direction = 'right';
        if(collision && p.landed > 0) {
          p.vx = -p.speed * collision.normalY;
          p.vy = p.speed * collision.normalX;
        } else {
          p.vx = p.speed;
        }
      } else {
        p.vx = 0;
        if(collision && p.landed > 0) {
          p.vy = 0;
        }
      }

      if(p.landed > 0 && (this.entity.inputs['up']) && !p.jumping) {
        p.vy = p.jumpSpeed;
        p.landed = -dt;
        p.jumping = true;
      } else if(this.entity.inputs['up']) {
        this.entity.trigger('jump', this.entity);
        p.jumping = true;
      }

      if(p.jumping && !(this.entity.inputs['up'])) {
        p.jumping = false;
        this.entity.trigger('jumped', this.entity);
        if(p.vy < p.jumpSpeed / 3) {
          p.vy = p.jumpSpeed / 3;
        }
      }
    }
    p.landed -= dt;
  }
});