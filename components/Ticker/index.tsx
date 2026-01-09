import { getPlayerPrices } from '@/lib/api';
import TickerClient from './TickerClient';

export default async function Ticker() {
    const prices = await getPlayerPrices();
    
    if (!prices || prices.length === 0) {
        return null;
    }

    return <TickerClient prices={prices} />;
}
