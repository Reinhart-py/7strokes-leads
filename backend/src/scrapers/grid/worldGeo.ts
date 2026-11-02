export interface CountryGeoEntry {
  name: string;
  code: string;
  capital: string;
  cities: string[];
  aliases?: string[];
}

export class WorldGeo {
  private static readonly COUNTRIES: CountryGeoEntry[] = [
    // Africa
    {
      name: 'Kenya',
      code: 'KE',
      capital: 'Nairobi',
      cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Ruiru', 'Kikuyu', 'Malindi', 'Naivasha', 'Kitale', 'Machakos', 'Thika', 'Kericho', 'Nyeri', 'Garissa', 'Meru']
    },
    {
      name: 'South Africa',
      code: 'ZA',
      capital: 'Pretoria',
      aliases: ['RSA', 'SA'],
      cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London', 'Nelspruit', 'Kimberley', 'Polokwane', 'Pietermaritzburg', 'Soweto', 'Sandton', 'Centurion']
    },
    {
      name: 'Nigeria',
      code: 'NG',
      capital: 'Abuja',
      cities: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City', 'Kaduna', 'Onitsha', 'Enugu', 'Aba', 'Warri', 'Ilorin', 'Jos', 'Abeokuta', 'Calabar']
    },
    {
      name: 'Egypt',
      code: 'EG',
      capital: 'Cairo',
      cities: ['Cairo', 'Alexandria', 'Giza', 'Shubra El Kheima', 'Port Said', 'Suez', 'Mansoura', 'Tanta', 'Asyut', 'Ismailia', 'Fayoum', 'Zagazig', 'Aswan', 'Damietta', 'Hurghada', 'Sharm El Sheikh']
    },
    {
      name: 'Morocco',
      code: 'MA',
      capital: 'Rabat',
      cities: ['Casablanca', 'Rabat', 'Fes', 'Marrakech', 'Tangier', 'Agadir', 'Meknes', 'Oujda', 'Kenitra', 'Tetouan', 'Safi', 'El Jadida']
    },
    {
      name: 'Ghana',
      code: 'GH',
      capital: 'Accra',
      cities: ['Accra', 'Kumasi', 'Tamale', 'Sekondi-Takoradi', 'Sunyani', 'Cape Coast', 'Koforidua', 'Tema', 'Techiman', 'Ho']
    },
    {
      name: 'Tanzania',
      code: 'TZ',
      capital: 'Dodoma',
      cities: ['Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Mbeya', 'Morogoro', 'Tanga', 'Zanzibar City', 'Tabora', 'Kigoma']
    },
    {
      name: 'Uganda',
      code: 'UG',
      capital: 'Kampala',
      cities: ['Kampala', 'Nansana', 'Kira', 'Mbarara', 'Mukono', 'Gulu', 'Lugazi', 'Masaka', 'Kasese', 'Hoima']
    },
    {
      name: 'Ethiopia',
      code: 'ET',
      capital: 'Addis Ababa',
      cities: ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Bahir Dar', 'Hawassa', 'Jimma', 'Adama', 'Dessie', 'Jijiga']
    },

    // Europe
    {
      name: 'Germany',
      code: 'DE',
      capital: 'Berlin',
      aliases: ['Deutschland'],
      cities: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hanover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bonn']
    },
    {
      name: 'United Kingdom',
      code: 'GB',
      capital: 'London',
      aliases: ['UK', 'Britain', 'Great Britain', 'England'],
      cities: ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Leeds', 'Liverpool', 'Newcastle', 'Sheffield', 'Bristol', 'Edinburgh', 'Belfast', 'Cardiff', 'Nottingham', 'Southampton', 'Leicester']
    },
    {
      name: 'France',
      code: 'FR',
      capital: 'Paris',
      cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Montpellier', 'Strasbourg', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Toulon', 'Saint-Étienne', 'Le Havre', 'Grenoble']
    },
    {
      name: 'Italy',
      code: 'IT',
      capital: 'Rome',
      aliases: ['Italia'],
      cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania', 'Verona', 'Venice', 'Messina', 'Padua', 'Trieste', 'Brescia']
    },
    {
      name: 'Spain',
      code: 'ES',
      capital: 'Madrid',
      aliases: ['Espana'],
      cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Malaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao', 'Alicante', 'Cordoba', 'Valladolid', 'Vigo', 'Gijon']
    },
    {
      name: 'Netherlands',
      code: 'NL',
      capital: 'Amsterdam',
      aliases: ['Holland'],
      cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Groningen', 'Tilburg', 'Almere', 'Breda', 'Nijmegen', 'Apeldoorn', 'Haarlem']
    },
    {
      name: 'Switzerland',
      code: 'CH',
      capital: 'Bern',
      aliases: ['Swiss'],
      cities: ['Zurich', 'Geneva', 'Basel', 'Lausanne', 'Bern', 'Winterthur', 'Lucerne', 'St. Gallen', 'Lugano', 'Biel']
    },
    {
      name: 'Sweden',
      code: 'SE',
      capital: 'Stockholm',
      cities: ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Upplands Väsby', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg', 'Jönköping']
    },
    {
      name: 'Norway',
      code: 'NO',
      capital: 'Oslo',
      cities: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Bærum', 'Kristiansand', 'Drammen', 'Asker', 'Lillestrøm', 'Fredrikstad', 'Tromsø']
    },
    {
      name: 'Denmark',
      code: 'DK',
      capital: 'Copenhagen',
      cities: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Frederiksberg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens', 'Vejle']
    },
    {
      name: 'Finland',
      code: 'FI',
      capital: 'Helsinki',
      cities: ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku', 'Jyväskylä', 'Lahti', 'Kuopio', 'Pori']
    },
    {
      name: 'Poland',
      code: 'PL',
      capital: 'Warsaw',
      aliases: ['Polska'],
      cities: ['Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Białystok', 'Katowice', 'Gdynia']
    },
    {
      name: 'Austria',
      code: 'AT',
      capital: 'Vienna',
      cities: ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Villach', 'Wels', 'Sankt Pölten', 'Dornbirn']
    },
    {
      name: 'Belgium',
      code: 'BE',
      capital: 'Brussels',
      cities: ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges', 'Namur', 'Leuven', 'Mons', 'Aalst']
    },
    {
      name: 'Portugal',
      code: 'PT',
      capital: 'Lisbon',
      cities: ['Lisbon', 'Porto', 'Vila Nova de Gaia', 'Amadora', 'Braga', 'Funchal', 'Coimbra', 'Setúbal', 'Almada', 'Aveiro', 'Faro']
    },
    {
      name: 'Greece',
      code: 'GR',
      capital: 'Athens',
      cities: ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa', 'Volos', 'Ioannina', 'Chania', 'Chalcis', 'Agrinio']
    },
    {
      name: 'Ireland',
      code: 'IE',
      capital: 'Dublin',
      cities: ['Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford', 'Drogheda', 'Dundalk', 'Swords', 'Bray', 'Navan']
    },
    {
      name: 'Iceland',
      code: 'IS',
      capital: 'Reykjavik',
      cities: ['Reykjavik', 'Kópavogur', 'Hafnarfjörður', 'Reykjanesbær', 'Akureyri', 'Garðabær', 'Mosfellsbær', 'Árborg', 'Akranes', 'Fjarðabyggð', 'Vestmannaeyjar']
    },
    {
      name: 'Czech Republic',
      code: 'CZ',
      capital: 'Prague',
      aliases: ['Czechia'],
      cities: ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc', 'České Budějovice', 'Hradec Králové', 'Ústí nad Labem', 'Pardubice']
    },

    // Asia & Middle East
    {
      name: 'India',
      code: 'IN',
      capital: 'New Delhi',
      aliases: ['Bharat'],
      cities: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal', 'Chandigarh', 'Noida', 'Gurugram', 'Kochi', 'Coimbatore', 'Vadodara', 'Patna', 'Ludhiana', 'Agra', 'Nashik']
    },
    {
      name: 'United Arab Emirates',
      code: 'AE',
      capital: 'Abu Dhabi',
      aliases: ['UAE', 'Emirates'],
      cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Al Ain']
    },
    {
      name: 'Saudi Arabia',
      code: 'SA',
      capital: 'Riyadh',
      aliases: ['KSA'],
      cities: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Tabuk', 'Buraidah', 'Khamis Mushait', 'Abha', 'Taif', 'Jubail', 'Yanbu', 'Hail', 'Najran']
    },
    {
      name: 'Qatar',
      code: 'QA',
      capital: 'Doha',
      cities: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor', 'Umm Salal', 'Lusail', 'Mesaieed']
    },
    {
      name: 'Kuwait',
      code: 'KW',
      capital: 'Kuwait City',
      cities: ['Kuwait City', 'Hawalli', 'Salmiya', 'Farwaniya', 'Al Ahmadi', 'Sabah Al Salem']
    },
    {
      name: 'Bahrain',
      code: 'BH',
      capital: 'Manama',
      cities: ['Manama', 'Riffa', 'Muharraq', 'Hamad Town', 'A\'ali', 'Isa Town', 'Sitra', 'Budaiya']
    },
    {
      name: 'Oman',
      code: 'OM',
      capital: 'Muscat',
      cities: ['Muscat', 'Salalah', 'Sohar', 'Nizwa', 'Sur', 'Seeb', 'Bawshar', 'Muttrah']
    },
    {
      name: 'Japan',
      code: 'JP',
      capital: 'Tokyo',
      cities: ['Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto', 'Kawasaki', 'Saitama', 'Hiroshima', 'Sendai', 'Chiba', 'Kitakyushu']
    },
    {
      name: 'Singapore',
      code: 'SG',
      capital: 'Singapore',
      cities: ['Singapore', 'Jurong', 'Tampines', 'Woodlands', 'Bedok', 'Ang Mo Kio', 'Hougang', 'Choa Chu Kang', 'Yishun', 'Toa Payoh']
    },
    {
      name: 'Malaysia',
      code: 'MY',
      capital: 'Kuala Lumpur',
      cities: ['Kuala Lumpur', 'George Town', 'Johor Bahru', 'Ipoh', 'Shah Alam', 'Petaling Jaya', 'Kuching', 'Kota Kinabalu', 'Malacca City', 'Alor Setar']
    },
    {
      name: 'Indonesia',
      code: 'ID',
      capital: 'Jakarta',
      cities: ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Bekasi', 'Tangerang', 'Depok', 'Semarang', 'Palembang', 'Makassar', 'Denpasar Bali', 'Batam']
    },
    {
      name: 'Thailand',
      code: 'TH',
      capital: 'Bangkok',
      cities: ['Bangkok', 'Nonthaburi', 'Pak Kret', 'Hat Yai', 'Chiang Mai', 'Nakhon Ratchasima', 'Udon Thani', 'Pattaya', 'Phuket', 'Surat Thani']
    },
    {
      name: 'Vietnam',
      code: 'VN',
      capital: 'Hanoi',
      cities: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hai Phong', 'Can Tho', 'Bien Hoa', 'Hue', 'Nha Trang', 'Buon Ma Thuot', 'Vung Tau']
    },
    {
      name: 'Philippines',
      code: 'PH',
      capital: 'Manila',
      cities: ['Manila', 'Quezon City', 'Davao City', 'Caloocan', 'Cebu City', 'Zamboanga City', 'Taguig', 'Pasig', 'Cagayan de Oro', 'Makati']
    },
    {
      name: 'South Korea',
      code: 'KR',
      capital: 'Seoul',
      aliases: ['Korea'],
      cities: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Suwon', 'Ulsan', 'Changwon', 'Goyang', 'Seongnam']
    },
    {
      name: 'Turkey',
      code: 'TR',
      capital: 'Ankara',
      aliases: ['Turkiye'],
      cities: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Sanliurfa', 'Mersin', 'Diyarbakir', 'Kayseri', 'Eskisehir']
    },

    // Americas
    {
      name: 'United States',
      code: 'US',
      capital: 'Washington, D.C.',
      aliases: ['USA', 'United States of America', 'America'],
      cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin', 'San Jose', 'Fort Worth', 'Jacksonville', 'Columbus', 'Charlotte', 'Indianapolis', 'San Francisco', 'Seattle', 'Denver', 'Washington', 'Boston', 'Nashville', 'Detroit', 'Miami', 'Atlanta']
    },
    {
      name: 'Canada',
      code: 'CA',
      capital: 'Ottawa',
      cities: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener', 'London', 'Victoria', 'Halifax', 'Oshawa', 'Windsor']
    },
    {
      name: 'Brazil',
      code: 'BR',
      capital: 'Brasília',
      aliases: ['Brasil'],
      cities: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Goiânia', 'Belém', 'Porto Alegre', 'Guarulhos', 'Campinas']
    },
    {
      name: 'Mexico',
      code: 'MX',
      capital: 'Mexico City',
      cities: ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Zapopan', 'Mérida', 'San Luis Potosí', 'Querétaro', 'Cancún', 'Aguascalientes', 'Hermosillo']
    },
    {
      name: 'Argentina',
      code: 'AR',
      capital: 'Buenos Aires',
      cities: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'San Miguel de Tucumán', 'Mar del Plata', 'Salta', 'Santa Fe', 'San Juan']
    },
    {
      name: 'Colombia',
      code: 'CO',
      capital: 'Bogotá',
      cities: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta', 'Soledad', 'Ibagué', 'Bucaramanga', 'Santa Marta']
    },
    {
      name: 'Chile',
      code: 'CL',
      capital: 'Santiago',
      cities: ['Santiago', 'Puente Alto', 'Maipú', 'La Florida', 'Antofagasta', 'Viña del Mar', 'Valparaíso', 'Talcahuano', 'San Bernardo', 'Temuco']
    },

    // Oceania
    {
      name: 'Australia',
      code: 'AU',
      capital: 'Canberra',
      aliases: ['Aussie'],
      cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle', 'Canberra', 'Sunshine Coast', 'Wollongong', 'Geelong', 'Hobart', 'Townsville', 'Cairns', 'Darwin']
    },
    {
      name: 'New Zealand',
      code: 'NZ',
      capital: 'Wellington',
      cities: ['Auckland', 'Christchurch', 'Wellington', 'Hamilton', 'Tauranga', 'Lower Hutt', 'Dunedin', 'Palmerston North', 'Napier', 'Porirua', 'Rotorua', 'New Plymouth']
    }
  ];

  public static findCountry(text: string): CountryGeoEntry | null {
    const clean = text.toLowerCase().trim();
    for (const c of this.COUNTRIES) {
      if (clean === c.name.toLowerCase() || clean === c.code.toLowerCase()) {
        return c;
      }
      if (c.aliases) {
        for (const alias of c.aliases) {
          if (clean === alias.toLowerCase()) return c;
        }
      }
      const wordRegex = new RegExp(`\\b${c.name}\\b`, 'i');
      if (wordRegex.test(clean)) return c;
      if (c.aliases) {
        for (const alias of c.aliases) {
          const aliasRegex = new RegExp(`\\b${alias}\\b`, 'i');
          if (aliasRegex.test(clean)) return c;
        }
      }
    }
    return null;
  }

  public static isCountry(name: string): boolean {
    return this.findCountry(name) !== null;
  }

  public static getCountryCities(name: string): string[] | null {
    const entry = this.findCountry(name);
    return entry ? entry.cities : null;
  }

  public static getAllCountryNames(): string[] {
    return this.COUNTRIES.map(c => c.name);
  }
}
