// Configuração estática da loja. Substituível por API quando o sub-projeto 3 chegar.
export const storeConfig = {
  whatsappBusinessName: 'Bragas Lanches', // nome usado na mensagem do WhatsApp
  brandName: "Braga's Burger", // marca visual do site
  whatsappNumber: '5521984019048',
  address: 'Higienópolis, Zona Norte — Rio de Janeiro',
  minOrder: 25,
  averagePrepTime: 25, // minutos médios de preparo na loja
  // null = fechado; senão [abre, fecha] em "HH:MM" (24h). Pode passar da meia-noite.
  openingHours: {
    sun: ['18:00', '00:00'] as [string, string],
    mon: null,
    tue: ['18:00', '23:40'] as [string, string],
    wed: ['18:00', '23:40'] as [string, string],
    thu: ['18:00', '23:40'] as [string, string],
    fri: ['18:00', '00:00'] as [string, string],
    sat: ['18:00', '00:00'] as [string, string],
  },
} as const;

export type OpeningHours = typeof storeConfig.openingHours;
