// https://www.tomtom.com
import _ from 'lodash'
import axios from 'axios'

type SearchResult = {
  lat: number,
  lon: number,
  limit: number,
  radius: number,
  language: string,
}

export const searchPlaces = async (query: string, options: SearchResult) => {
  const {lat, lon, radius = 10000, limit = 10, language} = options;

  const apiKey = process.env.TOMTOM_SEARCH_API_KEY;

  if (!apiKey) throw new Error('Missing TomTom API key.');

  let url: string;
  if (query) {
    url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json`;
  } else {
    url = 'https://api.tomtom.com/search/2/nearbySearch/.json'
  }

  try {
    const response = await axios.get(url, {
      params: _.omitBy({
        key: apiKey, lat, lon, radius, limit, language
      }, _.isNil),
    });

    const results = response.data.results;

    return results.map((place: any) => ({
      name: place.poi?.name || '',
      address: place.address?.freeformAddress || '',
      position: place.position || {},
      category: place.poi?.categories || [],
    }));
  } catch (err) {
    return []
    // throw new Error(err.response?.data?.error || err.message);
  }
}