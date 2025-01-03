/*jsl:option explicit*/
/*jsl:import lightbot.model.game.js*/

$(document).ready(function() {

  // save the program when the value of input[type=number] changes
  $("#programContainer").delegate(':input[type="number"]', "change", function() {
    lightBot.ui.editor.saveProgram();
  });

  // delete icon for instructions in the program
  $("#programContainer").delegate(".ui-icon-close", "click", function() {
    $(this).parent().parent().remove();
    lightBot.ui.editor.saveProgram();
  });

  // make instructions in the instruction set draggable
  $("#instructionsContainer li").draggable({
    revert: "invalid",
    appendTo: "body",
    helper: "clone",
    cursor: "move"
  }).addClass('ui-state-default');

  // hover effect for instructions
  $('#instructionsContainer, #programContainer').delegate('li', 'hover', function() {
    $(this).toggleClass('ui-state-hover');
  });
});

(function() {

  var editor = {
    focusAreaName: "procMain",
    // this function saves the current program in the localStorage
    clearPrograms: function() {
      $('#programContainer ul').empty();
      $('#procOneContainer ul').empty();
      $('#procTwoContainer ul').empty();
    },
    saveProgram: function() {
      // TODO save all three programs
      return;
      $('#programContainer ul').find(':input[type="number"]').each(function(){
        $(this).attr('value', $(this).val());
      });
      localStorage.setItem('lightbot_program_level_' + lightBot.map.getLevelNumber(), $('#programContainer ul').html());
    },
    loadProgram: function() {
      // TODO load from all three programs, add click to delete
      return;
      $('#programContainer ul').append(localStorage.getItem('lightbot_program_level_' + lightBot.map.getLevelNumber())).find('*').removeClass('ui-state-hover ui-state-droppable');
      this.makeDroppable();
    },
    // add from instrunction area clicked command to program area
    dropCommand: function(ui) {
      console.log("nodrag", ui)
      $( this ).children( ".placeholder" ).remove();
      var className = ui.children("p:first").attr("class");

      console.log("input", ui.text());
      this.addCommand(className, this.focusAreaName);

      // if the target area was the "main" programContainer ul, scroll to the bottom
      var tmp = $(this).parent();
      if (tmp.parent().is('#programContainer')) {
        tmp.animate({ scrollTop: tmp.height() }, "slow");
      }

      // save the program
      // lightBot.ui.editor.saveProgram();
    },
    addCommand: function(cmdClassName, focusAreaName) {
      var cmd = $('<li><p>'+cmdClassName+'</p></li>')
      cmd.children("p:first").addClass(cmdClassName);
      cmd.click(function () {
        console.log('remove', this);
        $(this).remove();
      });
      if (focusAreaName === "procOne") {
        cmd.appendTo('#procOneList')
      } else if (focusAreaName === "procTwo") {
        cmd.appendTo('#procTwoList')
      } else {
        cmd.appendTo('#mainList')
      }
    },
    // three focus area, procMain, procOne, procTwo, default to procMain
    focusProgram: function(areaName) {
      this.focusAreaName = areaName;
      const mainIdName = "#procMain";
      const oneIdName = "#procOne";
      const twoIdName = "#procTwo";
      var focusUI = $(mainIdName)
      var otherA = $(oneIdName)
      var otherB = $(twoIdName)
      if (areaName === "procOne") {
        focusUI = $(oneIdName)
        otherA = $(mainIdName)
      } else if (areaName === "procTwo") {
        focusUI = $(twoIdName)
        otherB = $(mainIdName)
      }
      const focusStyleName = "ui-state-droppable-hover"
      otherA.removeClass(focusStyleName)
      otherB.removeClass(focusStyleName)
      focusUI.removeClass(focusStyleName)
      focusUI.addClass(focusStyleName)
    },
    // this function makes "repeat" instructions a droppable area
    makeDroppable: function() {
      $("#programContainer ul").droppable({
        greedy: "true",
        activeClass: "ui-state-droppable",
        hoverClass: "ui-state-droppable-hover",
        accept: ":not(.ui-sortable-helper)",
        drop: function( event, ui ) {
          console.log("drophere", this);
          $( this ).children( ".placeholder" ).remove();
          var clone = $(ui.draggable.clone()).removeClass("ui-draggable");
          clone.appendTo( this );
          // make the area within repeat instructions droppable
          if (clone.children("div").hasClass("droppable")) {
            lightBot.ui.editor.makeDroppable();
          }

          // if the target area was the "main" programContainer ul, scroll to the bottom
          var tmp = $(this).parent();
          if (tmp.parent().is('#programContainer')) {
            tmp.animate({ scrollTop: tmp.height() }, "slow");
          }

          // save the program
          lightBot.ui.editor.saveProgram();
        }
      }).sortable({
        items: "li:not(.placeholder)",
        placeholder: "ui-state-highlight",
        cursor: "move",
        sort: function() {
          // gets added unintentionally by droppable interacting with sortable
          // using connectWithSortable fixes this, but doesn't allow you to customize active/hoverClass options
          $("#programContainer ul").removeClass( "ui-state-droppable" );
        },
        stop: function() {
          // save the program
          lightBot.ui.editor.saveProgram();
        }
      });
    },
    // recursively get all the instructions within a repeat instruction
    getInstructions: function(source) {
      var instructions = [];

      source.each(function(index) {
        switch ($(this).children('p').attr('class')) {
          case 'walk':
            instructions.push(new lightBot.bot.instructions.WalkInstruction());
            break;
          case 'jump':
            instructions.push(new lightBot.bot.instructions.JumpInstruction());
            break;
          case 'light':
            instructions.push(new lightBot.bot.instructions.LightInstruction());
            break;
          case 'turnLeft':
            instructions.push(new lightBot.bot.instructions.TurnLeftInstruction());
            break;
          case 'turnRight':
            instructions.push(new lightBot.bot.instructions.TurnRightInstruction());
            break;
          case 'proc1':
            instructions.push(new lightBot.bot.instructions.ProcOneInstruction());
            break
          case 'proc2':
            instructions.push(new lightBot.bot.instructions.ProcTwoInstruction());
            break
          case 'repeat':
            var counter = $(this).children('p').children('span').children('input').val();
            var body = lightBot.ui.editor.getInstructions($(this).children('div').children('div').children('ul').children('li'));
            instructions.push(new lightBot.bot.instructions.RepeatInstruction(counter, body));
            break;
          default:
            break;
        }
      });
      return instructions;
    }
  };

  lightBot.ui.editor = editor;
})();