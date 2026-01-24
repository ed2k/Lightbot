/*jsl:option explicit*/
/*jsl:import lightbot.model.game.js*/

(function() {
  var map = {};

  // Get maps from shared data file (lightbot.maps.data.js)
  var maps = window.lightBotMapsData || [];

  var levelSize = {'x': 0, 'y': 0}; // the level size
  var mapRef = null; // the actual map values
  var medals = null; // medals for the level
  var levelNumber = null; // what level is the user currently playing

  map.translateCmdToClassName = function(cmd) {
    switch(cmd) {
      case 'J': return "jump";
      case 'F': return "walk";
      case 'L': return "turnLeft";
      case 'R': return "turnRight";
      case '?': return "light";
      case 'p': return "proc1";
      case 'P': return "proc2";
    }
    console.log("translateCmdToClassName unknown cmd", cmd)
    return "unknown";
  },
  map.loadPrograms = function(x) {
    const progs = maps[x].programs
    if (!progs) return [];
    const result = [[],[],[]];
    for (let i=0;i<3;i++) {
      for (const char of progs[i]) {
        result[i].push(this.translateCmdToClassName(char))
      }
    }
    return result;
  }

  /*map.loadMaps = function() {
    $.getJSON('maps/maps.txt', function(data){
      maps = data;
    });
  };*/

  map.loadMap = function(x) {
    if (!maps) {
      console.error('Map list is empty');
    } else {
      // set the level number
      levelNumber = x;

      // set the bot starting direction
      lightBot.bot.init(maps[x].direction, maps[x].position);

      // set the level medals
      medals = maps[x].medals;

      // map files are defined user-friendly so we have to adapt to that
      levelSize.x = maps[x].map[0].length; // we suppose map is a rectangle
      levelSize.y = maps[x].map.length;

      mapRef = new Array(levelSize.x);
      for (i = 0; i < levelSize.x; i++) {
        mapRef[i] = new Array(levelSize.y);
      }

      var botInMap = false;
      var nbrLights = 0;

      for (var i = 0; i < maps[x].map.length; i++){
        for (var j = 0; j < maps[x].map[i].length; j++) {
          switch (maps[x].map[i][j].t) {
            case 'b':
              mapRef[j][maps[x].map.length - i - 1] = new lightBot.Box(maps[x].map[i][j].h, j, maps[x].map.length - i - 1);
              break;
            case 'l':
              mapRef[j][maps[x].map.length - i - 1] = new lightBot.LightBox(maps[x].map[i][j].h, j, maps[x].map.length - i - 1);
              nbrLights++;
              break;
            case 'e':
              mapRef[j][maps[x].map.length - i - 1] = new lightBot.ElevatorBox(maps[x].map[i][j].h, j, maps[x].map.length - i - 1);
              break;              
            default:
              // output error and fall back to box element
              console.error('Map contains unsupported element: ' + maps[x].map[i][j].t);
              mapRef[j][maps.map.length - i - 1] = new lightBot.Box(maps[x].map[i][j].h, j, maps[x].map.length - i - 1);
              break;
          }
        }
      }

      if (nbrLights === 0) {
        console.error('No light defined in map');
      }
    }
  };

  map.reset = function() {
    lightBot.bot.reset();
    for (var i = 0; i < levelSize.x; i++) {
      for (var j = 0; j < levelSize.y; j++) {
        mapRef[i][j].reset();
      }
    }
  };

  /* getters and setters */
  map.ready = function() {
    return levelNumber !== null;
  };

  map.getLevelSize = function() {
    return levelSize;
  };

  map.getMapRef = function() {
    return mapRef;
  };

  map.getMedals = function() {
    return medals;
  };

  map.getLevelNumber = function() {
    return levelNumber;
  };

  map.getNbrOfLevels = function() {
    return maps.length;
  };

  map.complete = function() {
    levelNumber = null; // by setting levelNumber to null, the map is marked as completed
  };

  // Map editor helper functions
  map.getCurrentMapState = function() {
    if (!map.ready()) {
      return null;
    }

    var state = {
      position: {
        x: lightBot.bot.currentPos.x,
        y: lightBot.bot.currentPos.y
      },
      direction: lightBot.bot.direction,
      map: [],
      medals: medals
    };

    // Deep copy the map data
    for (var i = 0; i < levelSize.x; i++) {
      state.map[i] = [];
      for (var j = 0; j < levelSize.y; j++) {
        var box = mapRef[i][j];
        var type = 'b'; // default to basic box

        if (box instanceof lightBot.LightBox) {
          type = 'l';
        } else if (box instanceof lightBot.ElevatorBox) {
          type = 'e';
        }

        state.map[i][j] = {
          h: box.height,
          t: type
        };
      }
    }

    return state;
  };

  map.loadMapState = function(state) {
    // Load a map state (used for reset)
    lightBot.bot.currentPos.x = state.position.x;
    lightBot.bot.currentPos.y = state.position.y;
    lightBot.bot.direction = state.direction;

    // Update all tiles
    for (var i = 0; i < state.map.length; i++) {
      for (var j = 0; j < state.map[i].length; j++) {
        if (mapRef[i] && mapRef[i][j]) {
          var oldBox = mapRef[i][j];
          var newHeight = state.map[i][j].h;
          var newType = state.map[i][j].t;

          // Check if type changed, if so recreate the box
          var oldType = 'b';
          if (oldBox instanceof lightBot.LightBox) {
            oldType = 'l';
          } else if (oldBox instanceof lightBot.ElevatorBox) {
            oldType = 'e';
          }

          if (oldType !== newType) {
            // Recreate box with new type
            switch (newType) {
              case 'b':
                mapRef[i][j] = new lightBot.Box(newHeight, i, j);
                break;
              case 'l':
                mapRef[i][j] = new lightBot.LightBox(newHeight, i, j);
                break;
              case 'e':
                mapRef[i][j] = new lightBot.ElevatorBox(newHeight, i, j);
                break;
            }
          } else {
            // Just update height
            mapRef[i][j].height = newHeight;
          }
        }
      }
    }
  };

  map.updateMapTile = function(x, y) {
    // Force update a single tile (for map editor)
    // This function is called after the map state has been updated in getCurrentMapState
    // The box object itself has already been modified, so this is mainly for validation
    if (mapRef[x] && mapRef[x][y]) {
      // Box has already been updated via direct property access
      // Just ensure the box is still valid
      return true;
    }
    return false;
  };

  lightBot.map = map;
})();
