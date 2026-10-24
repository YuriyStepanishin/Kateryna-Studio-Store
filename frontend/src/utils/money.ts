export const formatMoney = (value: number) => new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(value);
