/*jsl:option explicit*/
/*jsl:import lightbot.model.game.js*/

(function() {
  function ElevatorBox(height, x, y) {
    this.initialHeight = height;
    this.height = height; // assume height range is 0 - 5
    this.x = x;
    this.y = y;
    this.elevate = function() {
      this.height = (this.height + 2) % 6;
    };
    this.reset = function() {
      this.height = this.initialHeight;
    };
  }


  ElevatorBox.prototype = new lightBot.Box();
  ElevatorBox.prototype.constructor = ElevatorBox;
  lightBot.ElevatorBox = ElevatorBox;
})();