export const PRODUCT_IMAGES = {
    HONEY_SUMMER: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&q=80',
    HONEY_HEATHER: 'https://images.unsplash.com/photo-1589739900266-4399f579d5bf?w=800&q=80',
    SOAP: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=800&q=80',
    BEESWAX: 'https://images.unsplash.com/photo-1626202378964-340944f3e68e?w=800&q=80',
    COMB: 'https://images.unsplash.com/photo-1555447405-bd6145d279cf?w=800&q=80',
    GIFT: 'https://images.unsplash.com/photo-1596450524472-888a7d2e032f?w=800&q=80',
    FALLBACK: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&q=80', // Summer honey as safe fallback
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
    name: 'Lynghonning',
    price: 189,
    category: 'Honning',
    image_url: PRODUCT_IMAGES.HONEY_HEATHER,
    description: 'Kraftig og aromatisk lynghonning. Perfekt til ostefatet.',
    rating: 5.0,
    stock: 5,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
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
  {
    id: '4',
    name: 'Ren Bivoks (200g)',
    price: 129,
    category: 'Bivoks',
    image_url: PRODUCT_IMAGES.BEESWAX,
    description: '100% ren bivoks. Perfekt til lysstøping eller egen hudpleie.',
    rating: 4.9,
    stock: 15,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Tavlehonning',
    price: 249,
    category: 'Tavlehonning',
    image_url: PRODUCT_IMAGES.COMB,
    description: 'Hele stykker av vokstavle fylt med honning. En eksklusiv delikatesse.',
    rating: 4.9,
    stock: 3,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Gavepakke "Biens Beste"',
    price: 499,
    category: 'Gavepakker',
    image_url: PRODUCT_IMAGES.GIFT,
    description: 'En flott gaveeske med honning, såpe og et bivokslys.',
    rating: 5.0,
    stock: 8,
    is_active: true,
    created_at: new Date().toISOString()
  },
];
