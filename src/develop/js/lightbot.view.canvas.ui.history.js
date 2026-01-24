/*jsl:option explicit*/
/*jsl:import lightbot.model.game.js*/

$(document).ready(function() {

    console.log('History.js ready, checking URL parameters...');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', window.location.search);

    // Check for URL parameters to jump directly to a level FIRST
    var urlParams = new URLSearchParams(window.location.search);
    var levelParam = urlParams.get('level');
    var shouldLoadLevelFromUrl = false;
    var levelToLoad = 0;

    console.log('Level param from URL:', levelParam);

    if (levelParam) {
        var levelNumber = parseInt(levelParam, 10);
        console.log('Parsed level number:', levelNumber);

        // Validate level number (levels are 0-indexed internally but 1-indexed for users)
        // Assuming 24-25 levels, we'll validate after map is loaded
        if (!isNaN(levelNumber) && levelNumber >= 1 && levelNumber <= 25) {
            console.log('✓ Valid level number - will load level: ' + levelNumber);
            shouldLoadLevelFromUrl = true;
            levelToLoad = levelNumber - 1; // Convert 1-indexed to 0-indexed
        } else {
            console.error('✗ Invalid level number in URL: ' + levelParam);
        }
    } else {
        console.log('No level parameter in URL');
    }

    // Prepare
    var History = window.History; // Note: We are using a capital H instead of a lower h

    if ( !History.enabled ) {
         // History.js is disabled for this browser.
         // This is because we can optionally choose to support HTML4 browsers or not.
        console.log('History.js is disabled');

        // Load level directly if URL parameter present
        if (shouldLoadLevelFromUrl) {
            console.log('>>> History disabled, loading level:', levelToLoad);
            setTimeout(function() {
                lightBot.ui.showGameScreen(levelToLoad, false);
            }, 100);
        } else {
            console.log('>>> History disabled, showing welcome screen');
            lightBot.ui.showWelcomeScreen();
        }
        return;
    }

    // Bind to StateChange Event
    History.Adapter.bind(window,'statechange',function(){ // Note: We are using statechange instead of popstate
        var State = History.getState(); // Note: We are using History.getState() instead of event.state

        if (State === null) {
          lightBot.ui.showWelcomeScreen(true);
        } else {
          switch (State.data.page) {
            case 'welcomeScreen':
              lightBot.ui.showWelcomeScreen(true);
              break;
            case 'helpScreen':
              lightBot.ui.showHelpScreen(true);
              break;
            case 'achievementsScreen':
              lightBot.ui.showHelpScreen(true);
              break;
            case 'levelSelectScreen':
              lightBot.ui.showLevelSelectScreen(true);
              break;
            case 'gameScreen':
              lightBot.ui.showGameScreen(State.data.level, true);
              break;
            default:
              console.error('Unknown history page: ' + State.data.page);
              break;
          }
        }
    });

    lightBot.ui.History = History;

    // Initial screen load
    if (shouldLoadLevelFromUrl) {
        console.log('>>> Calling showGameScreen with level index:', levelToLoad);
        console.log('>>> lightBot.ui exists?', !!lightBot.ui);
        console.log('>>> lightBot.ui.showGameScreen exists?', !!lightBot.ui.showGameScreen);

        // Small delay to ensure everything is loaded
        setTimeout(function() {
            console.log('>>> Now loading level ' + (levelToLoad + 1) + ' from URL');
            lightBot.ui.showGameScreen(levelToLoad, false);
            console.log('>>> showGameScreen called');
        }, 100);
    } else {
        console.log('>>> Showing welcome screen (no URL param)');
        lightBot.ui.showWelcomeScreen();
    }
});