export const PRODUCT_IMAGES = {
    HONEY_SUMMER: '/BILDER/59896CE9-7983-4E4E-A436-67C9A2FFE599.png',
    HONEY_HEATHER: 'https://images.unsplash.com/photo-1589739900266-4399f579d5bf?w=800&q=80',
    SOAP: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=800&q=80',
    BEESWAX: 'https://images.unsplash.com/photo-1626202378964-340944f3e68e?w=800&q=80',
    COMB: 'https://images.unsplash.com/photo-1555447405-bd6145d279cf?w=800&q=80',
    GIFT_BROWN: '/BILDER/0AFA6AF8-4EB6-4A37-A6B2-009E51D464C3.png',
    GIFT_BLACK_LARGE: '/BILDER/5CA85119-ED8D-4F45-A6D5-F9C0A8C2D6C4.png',
    GIFT_WHITE_STACK: '/BILDER/DEB0F3F6-40D7-4B31-B5DA-0D4FF5DCD7B8.png',
    GIFT_BLACK_FLAT: '/BILDER/9ED45680-F7FC-46B2-903E-7222F976DA7E.png',
    FALLBACK: '/BILDER/59896CE9-7983-4E4E-A436-67C9A2FFE599.png',
};

export const MOCK_PRODUCTS = [
  {
    id: '1',
    name: 'Sommerhonning',
    price: 149,
    category: 'Honning',
    image_url: PRODUCT_IMAGES.HONEY_SUMMER,
    description: 'Deilig, lys sommerhonning fra lokale bigårder. Mild og fin smak.',
    rating: 4.8,
    stock: 10,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Gavepakke "Biens Beste"',
    price: 499,
    category: 'Gavepakker',
    image_url: PRODUCT_IMAGES.GIFT_BROWN,
    description: 'En flott gaveeske med honning, såpe og et bivokslys.',
    rating: 5.0,
    stock: 8,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Gavepakke "Eksklusiv Svart"',
    price: 699,
    category: 'Gavepakker',
    image_url: PRODUCT_IMAGES.GIFT_BLACK_LARGE,
    description: 'Vår mest eksklusive gavepakke i stilig svart utførelse.',
    rating: 5.0,
    stock: 5,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Gavepakke "Tårnet"',
    price: 549,
    category: 'Gavepakker',
    image_url: PRODUCT_IMAGES.GIFT_WHITE_STACK,
    description: 'Et tårn av smaker! Tre glass honning og såpe i en elegant hvit gaveeske.',
    rating: 4.9,
    stock: 12,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Gavepakke "Duo Svart"',
    price: 349,
    category: 'Gavepakker',
    image_url: PRODUCT_IMAGES.GIFT_BLACK_FLAT,
    description: 'En lekker svart gaveeske med to utvalgte honningglass.',
    rating: 4.8,
    stock: 20,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Håndlaget Bivoks-såpe',
    price: 89,
    category: 'Såpe',
    image_url: PRODUCT_IMAGES.SOAP,
    description: 'Naturlig såpe laget med bivoks og honning. Skånsom for huden.',
    rating: 4.7,
    stock: 20,
    is_active: true,
    created_at: new Date().toISOString()
  },
];
