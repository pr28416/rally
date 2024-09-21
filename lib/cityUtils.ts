import citiesData from '@/lib/json/cities.json';

type CitiesData = Record<string, string[]>;
const typedCitiesData = citiesData as CitiesData;

export function isTownInState(town: string, state: string): boolean {
  return state in typedCitiesData && typedCitiesData[state].includes(town);
}

export function getQueryLocation(town: string, state: string): { queryLocation: string; queryType: 'town' | 'state' } {
  const townExists = isTownInState(town, state);
  return {
    queryLocation: townExists ? `${town}, ${state}` : state,
    queryType: townExists ? 'town' : 'state'
  };
}