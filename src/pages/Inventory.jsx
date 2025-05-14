import React, { useEffect, useState } from 'react';
import {
    Box,
    Heading,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Stat,
    StatLabel,
    StatNumber,
    SimpleGrid,
    Spinner,
    Center,
} from '@chakra-ui/react';
// import { supabase } from '../supabaseClient';

export default function Inventory() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Totals
    const [totals, setTotals] = useState({
        spent: 0,
        revenue: 0,
        profit: 0,
    });

    useEffect(() => {
      // TODO: Load inventory data from Supabase
      setLoading(false);
    }, []);

    /*
    useEffect(() => {
        async function load() {
            const { data, error } = await supabase
                .from('inventory')
                .select('product_name, qty_bought, cost_per_unit, qty_sold, sale_price');
            if (error) {
                console.error('Error loading inventory:', error);
                setLoading(false);
                return;
            }
            setItems(data);

            // compute totals
            let spent = 0, revenue = 0;
            data.forEach(item => {
                spent   += item.qty_bought  * parseFloat(item.cost_per_unit);
                revenue += item.qty_sold    * parseFloat(item.sale_price);
            });
            setTotals({
                spent:   spent.toFixed(2),
                revenue: revenue.toFixed(2),
                profit:  (revenue - spent).toFixed(2),
            });
            setLoading(false);
        }
        load();
    }, []);
    */

    if (loading) {
        return (
            <Center h="100%">
                <Spinner size="xl" />
            </Center>
        );
    }

    return (
        <Box p={6}>
            <Heading mb={4}>Inventory & Profit Dashboard</Heading>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={8}>
                <Stat p={4} borderWidth="1px" borderRadius="md">
                    <StatLabel>Total Spent</StatLabel>
                    <StatNumber>${totals.spent}</StatNumber>
                </Stat>
                <Stat p={4} borderWidth="1px" borderRadius="md">
                    <StatLabel>Total Revenue</StatLabel>
                    <StatNumber>${totals.revenue}</StatNumber>
                </Stat>
                <Stat p={4} borderWidth="1px" borderRadius="md">
                    <StatLabel>Total Profit</StatLabel>
                    <StatNumber>${totals.profit}</StatNumber>
                </Stat>
            </SimpleGrid>

            <Table variant="striped" size="sm">
                <Thead>
                    <Tr>
                        <Th>Product</Th>
                        <Th isNumeric>Bought</Th>
                        <Th isNumeric>Cost/Unit</Th>
                        <Th isNumeric>Spent</Th>
                        <Th isNumeric>Sold</Th>
                        <Th isNumeric>Sale Price</Th>
                        <Th isNumeric>Revenue</Th>
                        <Th isNumeric>Profit</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {items.map(item => {
                        const spent   = item.qty_bought  * parseFloat(item.cost_per_unit);
                        const revenue = item.qty_sold    * parseFloat(item.sale_price);
                        return (
                            <Tr key={item.product_name}>
                                <Td>{item.product_name}</Td>
                                <Td isNumeric>{item.qty_bought}</Td>
                                <Td isNumeric>${parseFloat(item.cost_per_unit).toFixed(2)}</Td>
                                <Td isNumeric>${spent.toFixed(2)}</Td>
                                <Td isNumeric>{item.qty_sold}</Td>
                                <Td isNumeric>${parseFloat(item.sale_price).toFixed(2)}</Td>
                                <Td isNumeric>${revenue.toFixed(2)}</Td>
                                <Td isNumeric>${(revenue - spent).toFixed(2)}</Td>
                            </Tr>
                        );
                    })}
                </Tbody>
            </Table>
        </Box>
    );
}