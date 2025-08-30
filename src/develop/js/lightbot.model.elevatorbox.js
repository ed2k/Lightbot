/*jsl:option explicit*/
/*jsl:import lightbot.model.game.js*/

(function() {
  function ElevatorBox(height, x, y) {
    // this.lightOn = false;
    this.height = height; // assume height range is 1 - 6
    this.x = x;
    this.y = y;
    this.elevate = function() {
      this.height = (this.height + 2) % 6 + 1;
    };
    this.reset = function() {
      // this.lightOn = false;
    };
  }


  ElevatorBox.prototype = new lightBot.Box();
  ElevatorBox.prototype.constructor = ElevatorBox;
  lightBot.ElevatorBox = ElevatorBox;
})();