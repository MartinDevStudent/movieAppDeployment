export type SignUpBody = {
  username: string;
  password: string;
  email: string;
};

export type ConfirmSignUpBody = {
  username: string;
  code: string;
};

export type SignInBody = {
  username: string;
  password: string;
};

export type MovieReview = {
  movieId: number;
  reviewerName: string;
  reviewDate: string;
  content: string;
  rating: number;
};

export type MovieReviewsQueryParams = {
  minRating?: number;
};

export type TranslationQueryParams = {
  language: string;
};

export type CreateMovieReviewRequest = {
  movieId: number;
  reviewerName: string;
  content: string;
  rating: number;
};

export type UpdateMovieReviewRequest = {
  content: string;
};

export type FantasyMovieRequest = {
  title: string;
  overview: string;
  releaseDate: string;
  duration: number;
  productionCompany: string;
  genre: number;
};

export type FantasyMovie = {
  fantasyMovieId: number;
  title: string;
  overview: string;
  releaseDate: string;
  duration: number;
  productionCompany: string;
  genre: number;
};
