import React, { Component } from "react";
import PropTypes from "prop-types";
import * as faceapi from "face-api.js";
import "./TrackSearch.css";

class TrackSearch extends Component {
  state = {
    searchTerm: "",
    language: null,
    initialized: false,
    detectedEmotion: null,
  };

  videoRef = React.createRef();
  canvasRef = React.createRef();

  componentDidMount() {
    this.loadModels();
  }

  checkWebGLSupport = () => {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  };

  loadModels = async () => {
    if (!this.checkWebGLSupport()) {
      console.error("WebGL is not supported on this device.");
      return;
    }

    const MODEL_URL = "/models";
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
      ]);
      this.setState({ initialized: true });
    } catch (error) {
      console.error("Error loading models:", error);
    }
  };

  startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoRef.current.srcObject = stream;
      this.videoRef.current.onloadedmetadata = () => {
        this.videoRef.current.play();
      };
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  handleVideoPlay = () => {
    if (!this.canvasRef.current) return;

    const canvas = faceapi.createCanvasFromMedia(this.videoRef.current);
    this.canvasRef.current.innerHTML = "";
    this.canvasRef.current.appendChild(canvas);

    const displaySize = {
      width: this.videoRef.current.videoWidth,
      height: this.videoRef.current.videoHeight,
    };
    faceapi.matchDimensions(canvas, displaySize);

    this.detectEmotions(canvas, displaySize);
  };

  detectEmotions = (canvas, displaySize) => {
    const startDetection = () => {
      this.detectionInterval = setInterval(async () => {
        const detections = await faceapi
          .detectAllFaces(
            this.videoRef.current,
            new faceapi.TinyFaceDetectorOptions()
          )
          .withFaceLandmarks()
          .withFaceExpressions();

        const resizedDetections = faceapi.resizeResults(
          detections,
          displaySize
        );
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);

        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

        resizedDetections.forEach((detection) => {
          const { expressions } = detection;
          const dominantEmotion = Object.keys(expressions).reduce((a, b) =>
            expressions[a] > expressions[b] ? a : b
          );

          console.log(`Detected Emotion: ${dominantEmotion}`);
          this.setState({ detectedEmotion: dominantEmotion });

          clearInterval(this.detectionInterval);
          this.handleEmotionSearch(dominantEmotion);

          this.restartDetectionAfterDelay(5 * 60 * 1000);
        });
      }, 1000);
    };

    startDetection();
  };

  restartDetectionAfterDelay = (delay) => {
    console.log(`Pausing detection for ${delay / 60000} minutes...`);
    clearTimeout(this.reactivationTimeout);

    if (this.videoRef.current && this.videoRef.current.srcObject) {
      const tracks = this.videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      this.videoRef.current.srcObject = null;
    }

    this.reactivationTimeout = setTimeout(() => {
      console.log("Restarting detection...");
      this.startVideo();
    }, delay);
  };

  handleEmotionSearch = (emotion) => {
    let searchTerm;

    switch (emotion) {
      case "happy":
        searchTerm = "melody";
        break;
      case "sad":
        searchTerm = "motivational";
        break;
      case "neutral":
        searchTerm = "relaxing";
        break;
      default:
        searchTerm = "upbeat";
        break;
    }

    const query = `${searchTerm} ${this.state.language || "Tamil"} songs`;
    console.log("Auto-search term based on emotion:", query);

    // Update state and trigger search function
    this.setState({ searchTerm: query }, () => {
      this.triggerSearch(query); // Trigger the search
    });
  };

  triggerSearch = (query) => {
    const token = this.props.token || ""; // Include token if provided
    this.props.searchSongs(query, token);
  };

  updateSearchTerm = (e) => {
    this.setState({ searchTerm: e.target.value });
  };

  setLanguage = (language) => {
    this.setState({ language }, () => {
      if (!this.state.initialized) {
        this.loadModels().then(this.startVideo);
      } else {
        this.startVideo();
      }
    });
  };

  render() {
    return (
      <div className="track-search-container">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            this.triggerSearch(this.state.searchTerm);
          }}
        >
          <input
            onChange={this.updateSearchTerm}
            type="text"
            placeholder="Search..."
            value={this.state.searchTerm}
          />
          <div className="language-options">
            {["Tamil", "Telugu", "Hindi", "English"].map((lang) => (
              <label key={lang}>
                <input
                  type="radio"
                  name="language"
                  onChange={() => this.setLanguage(lang)}
                  checked={this.state.language === lang}
                />
                {lang}
              </label>
            ))}
          </div>
        </form>

        {this.state.language && this.state.initialized && (
          <div style={{ position: "relative", width: "100%" }}>
            <video
              ref={this.videoRef}
              onPlay={this.handleVideoPlay}
              autoPlay
              muted
              style={{ borderRadius: "10px" }}
            />
            <div
              ref={this.canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
            />
          </div>
        )}
      </div>
    );
  }
}

TrackSearch.propTypes = {
  searchSongs: PropTypes.func.isRequired,
  token: PropTypes.string,
};

export default TrackSearch;
