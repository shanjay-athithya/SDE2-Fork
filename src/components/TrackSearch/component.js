import React, { Component } from "react";
import PropTypes from "prop-types";
import * as faceapi from "face-api.js";
import "./TrackSearch.css";

class TrackSearch extends Component {
  state = {
    searchTerm: "",
    language: null,
    initialized: false,
  };

  videoRef = React.createRef();
  canvasRef = React.createRef();

  componentDidMount() {
    this.loadModels(); // Load models when the component mounts
  }

  checkWebGLSupport = () => {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl; // Returns true if WebGL is supported
  };

  loadModels = async () => {
    if (!this.checkWebGLSupport()) {
      console.error("WebGL is not supported on this device.");
      return; // Optionally display a message to the user
    }

    const MODEL_URL = "/models";
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(
        `${MODEL_URL}/tiny_face_detector_model-weights_manifest.json`
      );
      await faceapi.nets.faceLandmark68Net.loadFromUri(
        `${MODEL_URL}/face_landmark_68_model-weights_manifest.json`
      );
      await faceapi.nets.faceExpressionNet.loadFromUri(
        `${MODEL_URL}/face_expression_model-weights_manifest.json`
      );
      await faceapi.nets.ageGenderNet.loadFromUri(
        `${MODEL_URL}/age_gender_model-weights_manifest.json`
      );
      this.setState({ initialized: true });
    } catch (error) {
      console.error("Error loading models:", error);
    }
  };

  startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (this.videoRef.current) {
        this.videoRef.current.srcObject = stream;
        this.videoRef.current.onloadedmetadata = () => {
          this.videoRef.current.play();
        };
      } else {
        console.error("Video element not found.");
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  handleVideoPlay = () => {
    if (!this.canvasRef.current) return;

    const canvas = faceapi.createCanvasFromMedia(this.videoRef.current);
    this.canvasRef.current.innerHTML = ""; // Clear any previous canvas
    this.canvasRef.current.appendChild(canvas);

    const displaySize = {
      width: this.videoRef.current.videoWidth,
      height: this.videoRef.current.videoHeight,
    };
    faceapi.matchDimensions(canvas, displaySize);

    this.detectEmotions(canvas, displaySize);
  };

  detectEmotions = (canvas, displaySize) => {
    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(
          this.videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender(); // Include age and gender detection

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);

      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

      resizedDetections.forEach((detection) => {
        const { expressions, age, gender } = detection;
        const dominantEmotion = Object.keys(expressions).reduce((a, b) =>
          expressions[a] > expressions[b] ? a : b
        );

        // Log age and gender to the console
        console.log(`Age: ${age.toFixed(0)}, Gender: ${gender}`);

        // Check dominant emotion to handle music search
        if (
          dominantEmotion === "happy" ||
          dominantEmotion === "sad" ||
          dominantEmotion === "neutral"
        ) {
          this.handleEmotionSearch(dominantEmotion);
        }

        // Draw age and gender on the canvas
        const text = `${gender} (${age.toFixed(0)} years)`;
        const drawBox = new faceapi.draw.DrawBox(detection.detection.box, {
          label: text,
        });
        drawBox.draw(canvas);
      });
    }, 1000);
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
        searchTerm = "motivational"; 
        break;
      default:
        searchTerm = "motivational";
        break;
    }

    const query = `${searchTerm} ${this.state.language || "Tamil"} songs`;
    console.log("Search term based on emotion:", query);

    // Update the searchTerm state to autofill the input
    this.setState({ searchTerm: query }, () => {
     
      this.props.searchSongs(query);
    });
  };

  updateSearchTerm = (e) => {
    this.setState({
      searchTerm: e.target.value,
    });
  };

  setLanguage = (language) => {
    this.setState(
      {
        searchTerm: language,
        language,
      },
      () => {
        if (!this.state.initialized) {
          this.loadModels().then(this.startVideo); // Load models and start video on language selection
        } else {
          this.startVideo(); // Start video if already initialized
        }
      }
    );
  };

  render() {
    return (
      <div className="track-search-container">
        <form onSubmit={(e) => e.preventDefault()}>
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
                  checked={this.state.searchTerm === lang}
                />
                {lang}
              </label>
            ))}
          </div>
          <button onClick={() => this.setLanguage(this.state.language)}>
            <i className="fa fa-search search" aria-hidden="true" />
          </button>
        </form>

        {this.state.language && this.state.initialized && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end", // Aligns to the right
              alignItems: "flex-start", // Aligns to the top
              position: "relative",
              width: "100%",
            }}
          >
            <video
              ref={this.videoRef}
              onPlay={this.handleVideoPlay}
              autoPlay
              muted
              width="240" // Further reduced width for smaller video
              height="180" // Further reduced height for smaller video
              style={{ borderRadius: "10px" }}
            />
            <div
              ref={this.canvasRef}
              style={{
                position: "absolute",
                top: 0, // Aligns at the top
                right: 0, // Aligns at the right
                width: 120, // Smaller canvas width
                height: 90, // Smaller canvas height
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
};

export default TrackSearch;
