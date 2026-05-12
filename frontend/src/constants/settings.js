export const CASING_OPTIONS = [
  { value: 'title', label: 'Title Case' },
  { value: 'lower', label: 'Lower Case' },
  { value: 'upper', label: 'Upper Case' },
  { value: 'default', label: 'Original' },
];

export const SEPARATOR_OPTIONS = [
  { value: 'space', label: 'Space' },
  { value: 'dot', label: 'Dot (.)' },
  { value: 'dash', label: 'Dash (-)' },
  { value: 'underscore', label: 'Underscore (_)' },
];

export const PART_OPTIONS = [
  { value: 'Part', label: 'Part' },
  { value: 'CD', label: 'CD' },
  { value: 'Disc', label: 'Disc' },
  { value: 'Volume', label: 'Volume' },
  { value: 'Book', label: 'Book' },
];

export const NUMBERING_OPTIONS = [
  { value: '1, 2, 3..', label: '1, 2, 3..' },
  { value: 'I, II, III..', label: 'I, II, III..' },
  { value: 'A, B, C..', label: 'A, B, C..' },
];

export const METADATA_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'pl', label: 'Polish' },
  { value: 'nl', label: 'Dutch' },
  { value: 'sv', label: 'Swedish' },
  { value: 'da', label: 'Danish' },
  { value: 'fi', label: 'Finnish' },
  { value: 'no', label: 'Norwegian' },
  { value: 'cs', label: 'Czech' },
  { value: 'sk', label: 'Slovak' },
  { value: 'ro', label: 'Romanian' },
  { value: 'tr', label: 'Turkish' },
  { value: 'ar', label: 'Arabic' },
  { value: 'th', label: 'Thai' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'el', label: 'Greek' },
  { value: 'bg', label: 'Bulgarian' },
  { value: 'hr', label: 'Croatian' },
  { value: 'sr', label: 'Serbian' },
];

export const MOVIE_VARS = ['Title', 'OriginalTitle', 'Year', 'ReleaseDate', 'Edition', 'Source', 'Part', 'PartType', 'AudioType', 'Custom', 'ImdbId', 'TmdbId', 'RatingImdb', 'Resolution', 'VideoCodec', 'AudioCodec', 'AudioChannels', 'HDR', 'BitDepth', 'Framerate', 'VideoBitrate'];
export const TV_VARS = ['SeriesTitle', 'SeriesOriginalTitle', 'SeasonNumber', 'EpisodeNumber', 'EpisodeTitle', 'EpisodeAirDate', 'EpisodeAirYear', 'Networks', 'EpisodeRatingImdb', 'SeriesRatingImdb', 'SeriesTmdbId', 'EpisodeTmdbId', 'SeriesImdbId', 'EpisodeImdbId', 'Part', 'PartType', 'AudioType', 'Custom', 'Resolution', 'VideoCodec', 'AudioCodec', 'AudioChannels', 'HDR', 'BitDepth', 'Framerate', 'VideoBitrate'];
export const SERIES_VARS = ['SeriesTitle', 'SeriesOriginalTitle', 'FirstAirDate', 'LastAirDate', 'FirstAirYear', 'LastAirYear', 'YearRange', 'SeriesSeasonCount', 'SeriesEpisodeCount', 'SeriesStatus', 'SeriesType', 'Networks', 'Resolution', 'Director', 'SeriesTmdbId', 'SeriesImdbId', 'SeriesRatingImdb', 'Custom'];
export const SEASON_VARS = ['Resolution', 'SeasonNumber', 'SeasonName', 'SeasonAirDate', 'SeasonAirYear', 'SeasonEpisodeCount', 'SeasonTmdbId', 'Custom'];
