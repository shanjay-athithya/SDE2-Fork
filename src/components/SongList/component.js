import React, { Component } from "react";
import PropTypes from "prop-types";
import moment from "moment";
import "./SongList.css";

class SongList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentSongIndex: 0, // Track the index of the currently playing song
    };
  }

  componentDidUpdate(prevProps, prevState) {
    // Automatically fetch songs if token or viewType changes
    if (
      this.props.token !== prevProps.token &&
      !this.props.fetchSongsError &&
      this.props.fetchSongsPending &&
      this.props.viewType === "songs"
    ) {
      this.props.fetchSongs(this.props.token);
    }
  }

  handleSongEnd = () => {
    const { songs, audioControl } = this.props;
    const { currentSongIndex } = this.state;

    const nextSongIndex = (currentSongIndex + 1) % songs.length; // Move to the next song, loop back if at the end
    this.setState({ currentSongIndex: nextSongIndex });

    audioControl(songs[nextSongIndex]); // Play the next song
  };

  playSong = (song, index) => {
    const { audioControl } = this.props;
    this.setState({ currentSongIndex: index });
    audioControl(song); // Play the selected song
  };

  msToMinutesAndSeconds(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  }

  renderSongs() {
    return this.props.songs.map((song, i) => {
      const isActive = i === this.state.currentSongIndex;
      const buttonClass =
        isActive && !this.props.songPaused
          ? "fa-pause-circle-o"
          : "fa-play-circle-o";

      return (
        <li
          className={isActive ? "active user-song-item" : "user-song-item"}
          key={i}
        >
          <div onClick={() => this.playSong(song, i)} className="play-song">
            <i className={`fa ${buttonClass} play-btn`} aria-hidden="true" />
          </div>

          {this.props.viewType !== "songs" && (
            <p
              className="add-song"
              onClick={() => {
                this.props.addSongToLibrary(this.props.token, song.track.id);
              }}
            >
              {this.props.songAddedId === song.track.id ? (
                <i className="fa fa-check add-song" aria-hidden="true" />
              ) : (
                <i className="fa fa-plus add-song" aria-hidden="true" />
              )}
            </p>
          )}

          <div className="song-title">
            <p>{song.track.name}</p>
          </div>

          <div className="song-artist">
            <p>{song.track.artists[0].name}</p>
          </div>

          <div className="song-album">
            <p>{song.track.album.name}</p>
          </div>

          <div className="song-added">
            <p>{moment(song.added_at).format("YYYY-MM-DD")}</p>
          </div>

          <div className="song-length">
            <p>{this.msToMinutesAndSeconds(song.track.duration_ms)}</p>
          </div>
        </li>
      );
    });
  }

  render() {
    const { songs } = this.props;

    return (
      <div>
        <div className="song-header-container">
          <div className="song-title-header">
            <p>Title</p>
          </div>
          <div className="song-artist-header">
            <p>Artist</p>
          </div>
          <div className="song-album-header">
            <p>Album</p>
          </div>
          <div className="song-added-header">
            <i className="fa fa-calendar-plus-o" aria-hidden="true" />
          </div>
          <div className="song-length-header">
            <p>
              <i className="fa fa-clock-o" aria-hidden="true" />
            </p>
          </div>
        </div>
        {songs &&
          !this.props.fetchSongsPending &&
          !this.props.fetchPlaylistSongsPending &&
          this.renderSongs()}

        {/* Hidden Audio Element for Playback */}
        {songs.length > 0 && songs[this.state.currentSongIndex] && (
          <audio
            src={songs[this.state.currentSongIndex].track.preview_url}
            autoPlay
            onEnded={this.handleSongEnd}
          />
        )}
      </div>
    );
  }
}

SongList.propTypes = {
  viewType: PropTypes.string,
  token: PropTypes.string,
  songAddedId: PropTypes.string,
  songId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  songs: PropTypes.array.isRequired,
  fetchSongsError: PropTypes.bool,
  fetchSongsPending: PropTypes.bool,
  fetchPlaylistSongsPending: PropTypes.bool,
  fetchSongs: PropTypes.func,
  audioControl: PropTypes.func.isRequired,
  songPaused: PropTypes.bool,
  songPlaying: PropTypes.bool,
  resumeSong: PropTypes.func,
  pauseSong: PropTypes.func,
  addSongToLibrary: PropTypes.func,
};

export default SongList;
