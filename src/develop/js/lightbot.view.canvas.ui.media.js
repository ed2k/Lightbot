/*jsl:option explicit*/
/*jsl:import lightbot.model.game.js*/

$(document).ready(function() {
  return;
  // audio player - DISABLED to prevent loading menu.mp3 and game.mp3
  /*
  $("#audioPlayer").jPlayer({
    ready: function () {
     $(this).jPlayer("setMedia", lightBot.ui.media.audio.menu).jPlayer("play"); // attempt to auto-play
    },
    swfPath: "js",
    supplied: "mp3",
    loop: true,
    solution: "flash, html",
    cssSelectorAncestor: '#audioContainer'
  });
  */

  // load video container - DISABLED to prevent loading goal.webm
  /*
  $("#videoPlayer").jPlayer({
    ready: function () {
      $(this).jPlayer("setMedia", lightBot.ui.media.video[0]); // attempt to auto-play
    },
    swfPath: "js",
    supplied: "webmv, ogv, m4v",
    preload: 'metadata',
    cssSelectorAncestor: '#videoContainer',
    backgroundColor: '#000000',
    size: {
      width: "400px",
      height: "300px",
      cssClass: "jp-video-300p"
    }
  });
  */

  // Create dummy jQuery objects to prevent errors
  lightBot.ui.media.audioPlayer = $('<div>');
  lightBot.ui.media.videoPlayer = $('<div>');
});

(function() {
  return;
  var media = {
    audioPlayer: null,
    videoPlayer: null,
    audio: {
      menu: {
        mp3: "media/audio/menu.mp3"
      },
      game: {
        mp3: "media/audio/game.mp3"
      }
    },
    video: [
      {webmv: "media/video/goal.webm", m4v: "media/video/goal.mp4", ogv: "media/video/goal.ogv"},
      {webmv: "media/video/howto.webm", m4v: "media/video/howto.mp4", ogv: "media/video/howto.ogv"},
      {webmv: "media/video/objects.webm", m4v: "media/video/objects.mp4", ogv: "media/video/objects.ogv"},
      {webmv: "media/video/walk.webm", m4v: "media/video/walk.mp4", ogv: "media/video/walk.ogv"},
      {webmv: "media/video/turnRight.webm", m4v: "media/video/turnRight.mp4", ogv: "media/video/turnRight.ogv"},
      {webmv: "media/video/turnLeft.webm", m4v: "media/video/turnLeft.mp4", ogv: "media/video/turnLeft.ogv"},
      {webmv: "media/video/jump.webm", m4v: "media/video/jump.mp4", ogv: "media/video/jump.ogv"},
      {webmv: "media/video/light.webm", m4v: "media/video/light.mp4", ogv: "media/video/light.ogv"},
      {webmv: "media/video/repeat.webm", m4v: "media/video/repeat.mp4", ogv: "media/video/repeat.ogv"},
      {webmv: "media/video/medal.webm", m4v: "media/video/medal.mp4", ogv: "media/video/medal.ogv"}
    ],
    audioEnabled: false,
    playMenuAudio: function() {
      // Audio disabled - no longer loads menu.mp3
      // if (this.audioPlayer.data('jPlayer').status.media.mp3 != this.audio.menu.mp3) {
      //   this.audioPlayer.jPlayer('setMedia', this.audio.menu);
      //   if (this.audioEnabled) {
      //     this.audioPlayer.jPlayer('play');
      //   }
      // }
    },
    playGameAudio: function () {
      // Audio disabled - no longer loads game.mp3
      // if (this.audioPlayer.data('jPlayer').status.media.mp3 != this.audio.game.mp3) {
      //   this.audioPlayer.jPlayer('setMedia', this.audio.game);
      //   if (this.audioEnabled) {
      //     this.audioPlayer.jPlayer('play');
      //   }
      // }
    },
    playVideo: function(x) {
      // Video disabled - no longer loads video files
      // this.videoPlayer.jPlayer("setMedia", this.video[x]);
    },
    toggleAudioOn: function() {
      this.audioEnabled = true;
      // Audio player disabled
      // this.audioPlayer.jPlayer('play');

      $('.audioToggleButton').children('span.ui-button-icon-primary').addClass('ui-icon-volume-on').removeClass('ui-icon-volume-off');
    },
    toggleAudioOff: function() {
      this.audioEnabled = false;
      // Audio player disabled
      // this.audioPlayer.jPlayer('pause');

      $('.audioToggleButton').children('span.ui-button-icon-primary').addClass('ui-icon-volume-off').removeClass('ui-icon-volume-on');
    },
    toggleAudio: function() {
      if (this.audioEnabled) {
        this.toggleAudioOff();
      } else {
        this.toggleAudioOn();
      }
    }
  };

  lightBot.ui.media = media;
})();