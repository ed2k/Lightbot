/*jsl:option explicit*/
/*jsl:import lightbot.model.game.js*/

(function() {
  var mapEditorMode = false;
  var selectedBlock = null;
  var originalMapState = null;

  function toggleMapEditor() {
    console.log('toggleMapEditor called, current mode:', mapEditorMode);
    mapEditorMode = !mapEditorMode;

    var gameScreen = document.getElementById('gameScreen');
    var editorScreen = document.getElementById('mapEditorScreen');
    var editorButton = document.getElementById('mapEditorButton');

    console.log('Elements found:', {
      gameScreen: !!gameScreen,
      editorScreen: !!editorScreen,
      editorButton: !!editorButton
    });

    if (mapEditorMode) {
      // Save original map state
      var currentState = lightBot.map.getCurrentMapState();
      console.log('Current map state:', currentState);

      if (!currentState) {
        console.error('No map state available!');
        alert('Please load a level first before editing the map.');
        mapEditorMode = false;
        return;
      }

      originalMapState = JSON.parse(JSON.stringify(currentState));

      // Show editor, hide game (using jQuery like the rest of the app)
      $(gameScreen).hide();
      $(editorScreen).show();
      editorButton.textContent = 'Back to Game';
      editorButton.style.background = '#4CAF50';

      console.log('Editor screen display:', window.getComputedStyle(editorScreen).display);
      console.log('Editor screen visibility:', window.getComputedStyle(editorScreen).visibility);

      // Render the map grid
      renderMapGrid();
    } else {
      // Hide editor, show game
      $(editorScreen).hide();
      $(gameScreen).show();
      editorButton.textContent = 'Map Editor';
      editorButton.style.background = '#FF9800';

      // Clear selection
      clearBlockSelection();

      // Redraw canvas with updated map
      lightBot.draw();
    }
  }

  function renderMapGrid() {
    console.log('renderMapGrid called');
    var gridContainer = document.getElementById('mapGrid');
    if (!gridContainer) {
      console.error('mapGrid element not found!');
      return;
    }

    gridContainer.innerHTML = '';

    var mapState = lightBot.map.getCurrentMapState();
    console.log('Map state:', mapState);

    if (!mapState || !mapState.map) {
      console.error('No map state or map data!');
      return;
    }

    var map = mapState.map;
    var rows = map.length;
    var cols = map[0] ? map[0].length : 0;

    console.log('Rendering grid: ' + rows + ' x ' + cols);

    // Set grid layout
    gridContainer.style.gridTemplateColumns = 'repeat(' + cols + ', 40px)';

    console.log('Creating ' + (rows * cols) + ' cells...');

    // Create cells
    var cellCount = 0;
    for (var x = 0; x < rows; x++) {
      for (var y = 0; y < cols; y++) {
        var block = map[x][y];
        var cell = document.createElement('div');
        cell.className = 'map-cell';
        cell.setAttribute('data-x', x);
        cell.setAttribute('data-y', y);

        // Show height as background darkness (higher = lighter)
        var brightness = 50 + (block.h * 30);
        cell.style.background = 'rgb(' + brightness + ', ' + brightness + ', ' + brightness + ')';

        // Show type icon or height
        var icon = '';
        if (block.t === 'l') {
          icon = '💡';
        } else if (block.t === 'e') {
          icon = '🎚️';
        } else {
          icon = block.h; // Show height number
        }

        cell.textContent = icon;

        // Highlight bot starting position
        if (x === mapState.position.x && y === mapState.position.y) {
          cell.classList.add('bot-position');
        }

        // Click handler
        cell.addEventListener('click', (function(cx, cy) {
          return function() { selectBlock(cx, cy); };
        })(x, y));

        gridContainer.appendChild(cell);
        cellCount++;
      }
    }

    console.log('Grid rendered with ' + cellCount + ' cells');
    console.log('Grid container children:', gridContainer.children.length);
  }

  function selectBlock(x, y) {
    console.log('Selected block: (' + x + ', ' + y + ')');

    selectedBlock = { x: x, y: y };

    // Update visual selection
    var cells = document.querySelectorAll('.map-cell');
    for (var i = 0; i < cells.length; i++) {
      cells[i].classList.remove('selected');
    }

    var selectedCell = document.querySelector('.map-cell[data-x="' + x + '"][data-y="' + y + '"]');
    if (selectedCell) {
      selectedCell.classList.add('selected');
    }

    // Show block editor panel
    var editor = document.getElementById('blockEditor');
    var coords = document.getElementById('editCoords');
    editor.style.display = 'block';
    coords.textContent = x + ', ' + y;

    // Highlight current values
    var mapState = lightBot.map.getCurrentMapState();
    var block = mapState.map[x][y];

    // Clear all active states
    var allBtns = document.querySelectorAll('#blockEditor button');
    for (var i = 0; i < allBtns.length; i++) {
      allBtns[i].classList.remove('active');
    }

    // Highlight active height
    var heightBtns = document.querySelectorAll('.height-btn');
    for (var i = 0; i < heightBtns.length; i++) {
      var height = parseInt(heightBtns[i].getAttribute('data-height'));
      if (height === block.h) {
        heightBtns[i].classList.add('active');
      }
    }

    // Highlight active type
    var typeBtns = document.querySelectorAll('.type-btn');
    for (var i = 0; i < typeBtns.length; i++) {
      var type = typeBtns[i].getAttribute('data-type');
      if (type === block.t) {
        typeBtns[i].classList.add('active');
      }
    }
  }

  function setBlockHeight(height) {
    if (!selectedBlock) {
      console.log('No block selected');
      return;
    }

    var x = selectedBlock.x;
    var y = selectedBlock.y;
    console.log('Setting block (' + x + ', ' + y + ') height to ' + height);

    // Update the box object directly
    var mapRef = lightBot.map.getMapRef();
    if (mapRef[x] && mapRef[x][y]) {
      mapRef[x][y].height = height;
    }

    // Redraw canvas
    lightBot.draw();

    // Re-render grid to show changes
    renderMapGrid();

    // Re-select the block to update editor
    selectBlock(x, y);
  }

  function setBlockType(type) {
    if (!selectedBlock) {
      console.log('No block selected');
      return;
    }

    var x = selectedBlock.x;
    var y = selectedBlock.y;
    console.log('Setting block (' + x + ', ' + y + ') type to ' + type);

    // Get current box and recreate with new type
    var mapRef = lightBot.map.getMapRef();
    if (mapRef[x] && mapRef[x][y]) {
      var currentHeight = mapRef[x][y].height;

      // Create new box with the desired type
      switch (type) {
        case 'b':
          mapRef[x][y] = new lightBot.Box(currentHeight, x, y);
          break;
        case 'l':
          mapRef[x][y] = new lightBot.LightBox(currentHeight, x, y);
          break;
        case 'e':
          mapRef[x][y] = new lightBot.ElevatorBox(currentHeight, x, y);
          break;
      }
    }

    // Redraw canvas
    lightBot.draw();

    // Re-render grid to show changes
    renderMapGrid();

    // Re-select the block to update editor
    selectBlock(x, y);
  }

  function clearBlockSelection() {
    selectedBlock = null;

    var cells = document.querySelectorAll('.map-cell');
    for (var i = 0; i < cells.length; i++) {
      cells[i].classList.remove('selected');
    }

    var editor = document.getElementById('blockEditor');
    editor.style.display = 'none';
  }

  function resetMap() {
    if (!originalMapState) {
      console.log('No original map state to reset to');
      return;
    }

    console.log('Resetting map to original');

    // Restore original map state
    lightBot.map.loadMapState(originalMapState);

    // Redraw canvas
    lightBot.draw();

    // Re-render grid
    renderMapGrid();

    // Clear selection
    clearBlockSelection();
  }

  // Initialize when page loads
  $(document).ready(function() {
    console.log('Map editor initializing...');

    // Map editor button
    var mapEditorBtn = $('#mapEditorButton');
    console.log('Map editor button found:', mapEditorBtn.length);

    mapEditorBtn.click(function() {
      console.log('Map editor button clicked!');
      toggleMapEditor();
    });

    // Close editor button
    $('#closeMapEditorButton').click(toggleMapEditor);

    // Reset map button
    $('#resetMapButton').click(resetMap);

    // Clear selection button
    $('#clearSelectionButton').click(clearBlockSelection);

    // Height buttons
    $('.height-btn').click(function() {
      var height = parseInt($(this).attr('data-height'));
      setBlockHeight(height);
    });

    // Type buttons
    $('.type-btn').click(function() {
      var type = $(this).attr('data-type');
      setBlockType(type);
    });
  });

  // Export functions
  lightBot.mapEditor = {
    toggleMapEditor: toggleMapEditor,
    renderMapGrid: renderMapGrid,
    selectBlock: selectBlock,
    setBlockHeight: setBlockHeight,
    setBlockType: setBlockType,
    clearBlockSelection: clearBlockSelection,
    resetMap: resetMap
  };
})();
