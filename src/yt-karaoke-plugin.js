(function (global, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
  } else {
    global.Karaoke = factory();
  }
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";

  function loadScript() {
    return new Promise((resolve, reject) => {
      if (window.YT && YT.Player) {
        resolve(); // Si l'API est déjà chargée, on résout immédiatement
        return;
      }

      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.onload = () => {
        // Attendre que YT et YT.Player soient disponibles
        waitForYouTubeAPI(resolve, reject);
      };
      script.onerror = (err) => reject(err); // Rejeter en cas d'erreur
      document.body.appendChild(script);
    });
  }

  function waitForYouTubeAPI(resolve, reject) {
    const checkInterval = setInterval(() => {
      if (window.YT && YT.Player) {
        clearInterval(checkInterval);
        resolve(); // L'API est prête, on résout la promesse
      }
    }, 100); // Vérifier toutes les 100ms
  }

  class YouTubeKaraokePlugin {
    constructor(config = {}) {
      this.version = "1.1.1";
      this._config = {
        colors: {
          primaryColor: config.colors?.primaryColor || "#ff69b4",
          secondaryColor: config.colors?.secondaryColor || "#ff1493",
          accentColor: config.colors?.accentColor || "#ff8faf",
          backgroundColor: config.colors?.backgroundColor || "#1a0f1f",
          textColor: config.colors?.textColor || "#fff",
          glowColor1: config.colors?.glowColor1 || "#ffd700",
          glowColor2: config.colors?.glowColor2 || "#fff200",
        },
        floatingSymbol: config.floatingSymbol || "\u2665",
        videoId: config.videoId || "",
        lyrics: config.lyrics || [],
        containerId: config.containerId || "karaoke",
        font: config.font || "Dancing Script",
        shadows: {
          defaultBoxShadow:
            config.shadows?.defaultBoxShadow ||
            "0 0 20px rgba(255, 215, 0, 0.2), 0 0 40px rgba(255, 105, 180, 0.2), inset 0 0 60px rgba(255, 242, 0, 0.1)",
          hoverBoxShadow:
            config.shadows?.hoverBoxShadow ||
            "0 5px 15px rgba(0, 0, 0, 0.5), 0 10px 20px rgba(255, 105, 180, 0.4), inset 0 0 60px rgba(255, 242, 0, 0.1)",
        },
        onExpand: config.onExpand,
        onLineChange: config.onLineChange,
      };
      this.instanceId = this._config.containerId; // "karaoke-" + Math.random().toString(36).substr(2, 9);

      this.currentLineIndex = -1;
      this.init();
    }

    init() {
      this.injectStyles();
      this.createStructure();

      loadScript()
        .then(() => this.createPlayer())
        .catch((error) =>
          console.error("Erreur lors du chargement de l'API YouTube :", error)
        );
    }

    injectStyles() {
      const styleId = `karaoke-styles-${this.instanceId}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          @import url('https://fonts.googleapis.com/css2?family=${this._config.font.replace(
            " ",
            "+"
          )}:wght@400;700&display=swap');

          #${this.instanceId} .karaoke {
            --romantic-primary: ${this._config.colors.primaryColor};
            --romantic-secondary: ${this._config.colors.secondaryColor};
            --romantic-accent: ${this._config.colors.accentColor};
            --romantic-bg: ${this._config.colors.backgroundColor};
            --romantic-text: ${this._config.colors.textColor};
            --viral-glow1: ${this._config.colors.glowColor1};
            --viral-glow2: ${this._config.colors.glowColor2};

            height: 0;
            padding: 0;
            margin: 0;
            opacity: 0;
            overflow: hidden;
            background: linear-gradient(
              135deg,
              ${this._config.colors.backgroundColor}f2 0%,
              ${this._config.colors.backgroundColor}e6 50%,
              ${this._config.colors.backgroundColor}f2 100%
            );
            border-radius: 30px;
            border: 1px solid var(--romantic-primary);
            position: relative;
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          }

          #${this.instanceId} .karaoke.expand {
            height: auto;
            min-height: 200px;
            padding: 2rem;
            margin: 1rem 0;
            opacity: 1;
            animation: appearWithLove-${
              this.instanceId
            } 1.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: ${this._config.shadows.defaultBoxShadow};
            transition: all 0.5s ease;
          }

          #${this.instanceId} .karaoke.expand:hover {
            transform: translateY(-5px) scale(1.01);
            box-shadow: ${this._config.shadows.hoverBoxShadow};
          }

          #${this.instanceId} .karaoke.expand:hover::before {
            animation: glowingLove-${this.instanceId} 4s infinite alternate,
                      particleShift-${this.instanceId} 8s infinite linear;
          }

          #${this.instanceId} .karaoke::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background:
              radial-gradient(circle at 30% 20%, var(--romantic-secondary) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, var(--romantic-primary) 0%, transparent 50%);
            opacity: 0;
            transition: opacity 1s ease;
            pointer-events: none;
            border-radius: inherit;
          }

          #${this.instanceId} .karaoke.expand::before {
            opacity: 1;
            animation: glowingLove-${this.instanceId} 4s infinite alternate;
          }

          #${this.instanceId} .karaoke.expand::after {
            content: '${this._config.floatingSymbol}';
            position: absolute;
            color: var(--romantic-primary);
            font-size: 1.5rem;
            pointer-events: none;
            animation: floatingSymbols-${this.instanceId} 3s infinite;
            opacity: 0;
          }

          #${this.instanceId} .karaoke.expand > div::before,
          #${this.instanceId} .karaoke.expand > div::after {
            content: '${this._config.floatingSymbol}';
            position: absolute;
            color: var(--viral-glow1);
            font-size: 1.2rem;
            pointer-events: none;
            opacity: 0;
          }

          #${this.instanceId} .karaoke.expand > div::before {
            left: 20%;
            animation: floatingSymbols-${this.instanceId} 4s infinite 1s;
          }

          #${this.instanceId} .karaoke.expand > div::after {
            right: 20%;
            animation: floatingSymbols-${this.instanceId} 3.5s infinite 0.5s;
          }

          #${this.instanceId} .line {
            font-family: '${this._config.font}', cursive;
            font-size: 2.2rem;
            color: var(--romantic-text);
            text-align: center;
            opacity: 0;
            position: relative;
            transition: all 0.4s ease;
            transform: scale(0.9) translateY(20px);
            width: 100%;
            padding: 0.5rem;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            cursor: default;
          }

          #${this.instanceId} .line.highlight {
            opacity: 1;
            background: linear-gradient(45deg, var(--romantic-primary), var(--viral-glow1));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            transform: scale(1) translateY(0);
            animation: heartbeat-${this.instanceId} 2s infinite,
                      viralGlow-${this.instanceId} 3s infinite alternate;
          }

          #${this.instanceId} .line.waiting {
            opacity: 0.6;
            color: rgba(255, 255, 255, 0.7);
            font-size: 1.4rem;
            transform: scale(0.85) translateY(0);
            filter: blur(0.5px);
          }

          #${this.instanceId} .line.waiting:hover {
            opacity: 0.8;
            transform: scale(0.87);
            filter: blur(0);
            color: rgba(255, 255, 255, 0.9);
            text-shadow:
              0 0 10px var(--viral-glow1),
              0 0 20px var(--romantic-primary);
          }

          @keyframes appearWithLove-${this.instanceId} {
            0% {
              opacity: 0;
              transform: scale(0.8) translateY(30px);
              filter: blur(10px);
            }
            50% {
              opacity: 0.5;
              transform: scale(1.02) translateY(15px);
              filter: blur(5px);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
              filter: blur(0);
            }
          }

          @keyframes glowingLove-${this.instanceId} {
            0% {
              filter: blur(10px) brightness(1);
            }
            100% {
              filter: blur(15px) brightness(1.3);
            }
          }

          @keyframes particleShift-${this.instanceId} {
            0% {
              background-position: 0% 0%;
            }
            100% {
              background-position: 200% 0%;
            }
          }

          @keyframes floatingSymbols-${this.instanceId} {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 0;
            }
            50% {
              opacity: 0.6;
            }
            100% {
              transform: translateY(-100px) rotate(360deg);
              opacity: 0;
            }
          }

          @keyframes heartbeat-${this.instanceId} {
            0%, 100% { transform: scale(1); }
            5% { transform: scale(1.02); }
            10% { transform: scale(1); }
            15% { transform: scale(1.02); }
            20%, 100% { transform: scale(1); }
          }

          @keyframes viralGlow-${this.instanceId} {
            0% {
              text-shadow:
                0 0 10px var(--viral-glow1),
                0 0 20px var(--romantic-primary),
                0 0 30px var(--viral-glow2);
            }
            100% {
              text-shadow:
                0 0 15px var(--viral-glow1),
                0 0 30px var(--romantic-primary),
                0 0 45px var(--viral-glow2);
            }
          }

          @media (max-width: 768px) {
            #${this.instanceId} .karaoke.expand {
              padding: 1.5rem;
              margin: 0.5rem;
            }

            #${this.instanceId} .line {
              font-size: 1.8rem;
            }

            #${this.instanceId} .line.waiting {
              font-size: 1.2rem;
            }

            #${this.instanceId} .karaoke.expand:hover {
              transform: translateY(-3px) scale(1.005);
            }
          }
        `;
        document.head.appendChild(style);
      }
    }

    createStructure() {
      const container = document.getElementById(this._config.containerId);
      if (!container) {
        console.error(
          `Container with id "${this._config.containerId}" not found`
        );
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.id = this.instanceId;
      wrapper.innerHTML = `
        <div class="video-container">
          <div id="player-${this.instanceId}"></div>
        </div>
        <div class="karaoke" id="karaoke-box-${this.instanceId}">
          <div class="lyrics-container" id="lyrics-container-${this.instanceId}"></div>
        </div>
      `;
      container.appendChild(wrapper);
    }

    createPlayer() {
      this.player = new YT.Player(`player-${this.instanceId}`, {
        videoId: this._config.videoId,
        events: {
          onStateChange: (event) => this.onPlayerStateChange(event),
        },
      });
    }

    onPlayerStateChange(event) {
      if (event.data === YT.PlayerState.PLAYING) {
        this.startLyricsSync();
      } else if (event.data === YT.PlayerState.ENDED) {
        this._config.onVideoEnded?.();
      }
    }

    startLyricsSync() {
      const interval = setInterval(() => {
        const currentTime = this.player.getCurrentTime();
        this.displayLyrics(currentTime);

        if (
          currentTime >=
          this._config.lyrics[this._config.lyrics.length - 1].time
        ) {
          clearInterval(interval);
        }
      }, 100);
    }

    displayLyrics(currentTime) {
      const lineIndex = this.getCurrentLineIndex(currentTime);
      const lyricsContainer = document.getElementById(
        `lyrics-container-${this.instanceId}`
      );
      const karaokeBox = document.getElementById(
        `karaoke-box-${this.instanceId}`
      );

      if (lineIndex !== this.currentLineIndex && lineIndex !== -1) {
        const line = this._config.lyrics[lineIndex];

        const lineElement = document.createElement("div");
        lineElement.classList.add("line");
        lineElement.innerHTML = line.text;
        lyricsContainer.appendChild(lineElement);

        if (this.currentLineIndex === -1) {
          karaokeBox.classList.add("expand");
          this._config.onExpand?.();
        }

        const lines = lyricsContainer.children;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i] !== lineElement) {
            lines[i].classList.add("waiting");
            lines[i].classList.remove("highlight");
          }
        }

        setTimeout(() => {
          lineElement.classList.add("highlight");
          this._config.onLineChange?.(lineIndex, line, lineElement);
        }, 0);

        this.currentLineIndex = lineIndex;

        if (lyricsContainer.children.length > 3) {
          lyricsContainer.removeChild(lyricsContainer.firstChild);
        }
      }
    }

    getCurrentLineIndex(currentTime) {
      let currentIndex = -1;
      for (let i = 0; i < this._config.lyrics.length; i++) {
        if (this._config.lyrics[i].time <= currentTime) {
          currentIndex = i;
        }
      }
      return currentIndex;
    }
  }

  return { YouTubeKaraokePlugin };
});
