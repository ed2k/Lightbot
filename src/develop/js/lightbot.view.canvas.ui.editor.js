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
    saveProgram: function() {
      // TODO save all three programs
      $('#programContainer ul').find(':input[type="number"]').each(function(){
        $(this).attr('value', $(this).val());
      });
      localStorage.setItem('lightbot_program_level_' + lightBot.map.getLevelNumber(), $('#programContainer ul').html());
    },
    loadProgram: function() {
      // TODO load from all three programs, add click to delete
      $('#programContainer ul').append(localStorage.getItem('lightbot_program_level_' + lightBot.map.getLevelNumber())).find('*').removeClass('ui-state-hover ui-state-droppable');
      this.makeDroppable();
    },
    // add from instrunction area clicked command to program area
    dropCommand: function(ui) {
      console.log("nodrag", ui)
      $( this ).children( ".placeholder" ).remove();
      var className = ui.children("p:first").attr("class");

      console.log("input", ui.text());
      var cmd = $('<li><p>'+className+'</p></li>')
      cmd.children("p:first").addClass(className);
      cmd.click(function () {
        console.log('remove', this);
        $(this).remove();
      });
      if (this.focusAreaName === "procOne") {
        cmd.appendTo('#procOneList')
      } else if (this.focusAreaName === "procTwo") {
        cmd.appendTo('#procTwoList')
      } else {
        cmd.appendTo('#mainList')
      }
      // if the target area was the "main" programContainer ul, scroll to the bottom
      var tmp = $(this).parent();
      if (tmp.parent().is('#programContainer')) {
        tmp.animate({ scrollTop: tmp.height() }, "slow");
      }

      // save the program
      lightBot.ui.editor.saveProgram();
    },
    focusProgram: function(areaName) {
      this.focusAreaName = areaName;
      var focusUI = $('#programContainer')
      var otherA = $('#procOneContainer')
      var otherB = $('#procTwoContainer')
      if (areaName === "procOne") {
        focusUI = $('#procOneContainer')
        otherA = $('#programContainer')
      } else if (areaName === "procTwo") {
        focusUI = $('#procTwoContainer')
        otherB = $('#programContainer')
      }
      otherA.removeClass("ui-state-droppable")
      otherB.removeClass("ui-state-droppable")
      focusUI.removeClass("ui-state-droppable")
      focusUI.addClass("ui-state-droppable")
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