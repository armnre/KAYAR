// Shared track shape used by the Morshed/Podcast players.
export type Track = { id: string; title: string; artist: string; duration: number; cat: string; hue: number; license: string; audio?: string; image?: string; album?: string; licenseUrl?: string; shareUrl?: string; rights?: string; source?: 'library' | 'podcast'; featured?: boolean };
