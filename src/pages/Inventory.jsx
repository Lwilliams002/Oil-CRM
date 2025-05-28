import React, { useEffect, useState, useCallback, useRef } from 'react';
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
    FormControl,
    FormLabel,
    Input,
    Button, Flex,
} from '@chakra-ui/react';
import {jsPDF}       from 'jspdf';

import { supabase } from '../supabaseClient';
import html2canvas from "html2canvas";

export default function Inventory() {
    const printRef = useRef();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totals, setTotals] = useState({
        deposit: 0,
        envios: 0,
        entrada: 0,
        accesorios: 0,
        gastos: 0,
        salario: 0,
        masajes: 0,
    });

    // For adding a new record
    const [newItem, setNewItem] = useState({
        day: '',
        deposit: '',
        envios: '',
        entrada: '',
        accesorios: '',
        gastos: '',
        salario: '',
        masajes: '',
    });
    const handleExportPdf = async () => {
              // 1) render the whole container to a high-res canvas
        const canvas = await html2canvas(printRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');

                  // 2) build a PDF with letter-size pages
        const pdf    = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
        const margin = 40;
        const pageWidth  = pdf.internal.pageSize.getWidth();
        const usableWidth = pageWidth - 2 * margin;

                  // scale image to fit width
        const { width: imgW, height: imgH } = pdf.getImageProperties(imgData);
        const scaledH = (imgH * usableWidth) / imgW;

                  // place first page
        pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, scaledH);

                  // if taller than one page, add remaining pages
        const pageHeight = pdf.internal.pageSize.getHeight();
        let heightLeft  = scaledH - (pageHeight - 2 * margin);
        while (heightLeft > 0) {
            pdf.addPage();
            pdf.addImage(
                imgData,
                'PNG',
                margin,
                margin - (pageHeight - 2 * margin) * (1 - (heightLeft / scaledH)),
                usableWidth,
                scaledH
            );
            heightLeft -= (pageHeight - 2 * margin);
        }

              // 3) trigger download
        pdf.save('inventory.pdf');
        };

    // For filtering by 14-day period + saved periods list
    const [periodStart, setPeriodStart] = useState('');
    const [savedPeriods, setSavedPeriods] = useState([]);

    // load() now filters by periodStart → periodStart + 13 days
    const load = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('inventory')
            .select('day, deposit, envios, entrada, accesorios, gastos, salario, masajes');

        if (periodStart) {
            const start = new Date(periodStart);
            const end = new Date(start);
            end.setDate(end.getDate() + 13);
            const startISO = start.toISOString().slice(0, 10);
            const endISO   = end  .toISOString().slice(0, 10);

            query = query
                .gte('day', startISO)
                .lte('day', endISO);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error loading inventory:', error);
            setLoading(false);
            return;
        }
        setItems(data);

        // recompute totals
        const sums = data.reduce((acc, item) => {
            acc.deposit    += parseFloat(item.deposit)    || 0;
            acc.envios     += parseFloat(item.envios)     || 0;
            acc.entrada    += parseFloat(item.entrada)    || 0;
            acc.accesorios += parseFloat(item.accesorios) || 0;
            acc.gastos     += parseFloat(item.gastos)     || 0;
            acc.salario    += parseFloat(item.salario)    || 0;
            acc.masajes    += parseFloat(item.masajes)    || 0;
            return acc;
        }, { deposit:0, envios:0, entrada:0, accesorios:0, gastos:0, salario:0, masajes:0 });

        setTotals(sums);
        setLoading(false);
    }, [periodStart]);

    // reload whenever periodStart changes
    useEffect(() => {
        load();
    }, [load]);

    // fetch distinct saved fortnight starts
    const handleShowPeriods = async () => {
        const { data, error } = await supabase
            .from('inventory')
            .select('period_start', { distinct: true })
            .order('period_start', { ascending: false });
        if (error) {
            console.error('Error fetching saved periods:', error);
            return;
        }
        const periods = data
            .map(r => r.period_start)
            .filter(d => d);
        const unique = Array.from(new Set(periods));
        unique.sort((a, b) => b.localeCompare(a));
        setSavedPeriods(unique);
    };

    // handle changes for both newItem and periodStart
    const handleChange = e => {
        const { name, value } = e.target;
        if (name === 'periodStart') {
            setPeriodStart(value);
        } else {
            setNewItem(prev => ({ ...prev, [name]: value }));
        }
    };

    // insert new record (day stays as-is)
    const handleAdd = async () => {
        const payload = {
            day:      newItem.day,
            deposit:    parseFloat(newItem.deposit)    || 0,
            envios:     parseFloat(newItem.envios)     || 0,
            entrada:    parseFloat(newItem.entrada)    || 0,
            accesorios: parseFloat(newItem.accesorios) || 0,
            gastos:     parseFloat(newItem.gastos)     || 0,
            salario:    parseFloat(newItem.salario)    || 0,
            masajes:    parseFloat(newItem.masajes)    || 0,
        };
        const { error } = await supabase.from('inventory').insert([payload]);
        if (error) {
            console.error('Error adding inventory item:', error);
            return;
        }
        // clear form & reload current period
        setNewItem({
            day: '',
            deposit: '',
            envios: '',
            entrada: '',
            accesorios: '',
            gastos: '',
            salario: '',
            masajes: '',
        });
        load();
    };

    if (loading) {
        return (
            <Center h="100%">
                <Spinner size="xl" />
            </Center>
        );
    }

    return (

        <Box p={6} ref={printRef}>
            <Flex mb={4} align={"center"}>
                <Heading flex={"1"}>Inventory &amp; Fortnightly Summary</Heading>
                <Button
                    colorScheme={"gray"}
                    variant="outline"
                    onClick = {handleExportPdf}>
                    Print Page
                </Button>
            </Flex>

            {/* Period Filter + Show button */}
            <Box mb={6} display="flex" alignItems="flex-end" gridGap={4}>
                <FormControl maxW="xs">
                    <FormLabel>Period starts on (14-day)</FormLabel>
                    <Input
                        name="periodStart"
                        type="date"
                        value={periodStart}
                        onChange={handleChange}
                    />
                </FormControl>
                <Button mt="24px" colorScheme="teal" onClick={handleShowPeriods}>
                    Show saved periods
                </Button>
            </Box>

            {/* Saved periods list */}
            {savedPeriods.length > 0 && (
                <Box mb={6}>
                    <Heading size="sm" mb={2}>Previously used start dates:</Heading>
                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
                        {savedPeriods.map(ps => (
                            <Button key={ps} size="sm" onClick={() => setPeriodStart(ps)}>
                                {ps}
                            </Button>
                        ))}
                    </SimpleGrid>
                </Box>
            )}

            {/* ── Add Item Form ────────────────────────────────────────── */}
            <Box mb={8} p={4} borderWidth="1px" borderRadius="md">
                <Heading size="md" mb={4}>Add New Entry</Heading>
                <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                    <FormControl>
                        <FormLabel>Day</FormLabel>
                        <Input
                            name="day"
                            type="date"
                            value={newItem.day}
                            onChange={handleChange}
                        />
                    </FormControl>
                    {/* numeric inputs… */}
                    <FormControl>
                        <FormLabel>Deposito</FormLabel>
                        <Input
                            name="deposit"
                            type="number"
                            value={newItem.deposit}
                            onChange={handleChange}
                            placeholder="0"
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Envios</FormLabel>
                        <Input
                            name="envios"
                            type="number"
                            value={newItem.envios}
                            onChange={handleChange}
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Entrada</FormLabel>
                        <Input
                            name="entrada"
                            type="number"
                            value={newItem.entrada}
                            onChange={handleChange}
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Accesorios</FormLabel>
                        <Input
                            name="accesorios"
                            type="number"
                            value={newItem.accesorios}
                            onChange={handleChange}
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Gastos</FormLabel>
                        <Input
                            name="gastos"
                            type="number"
                            value={newItem.gastos}
                            onChange={handleChange}
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Salario</FormLabel>
                        <Input
                            name="salario"
                            type="number"
                            value={newItem.salario}
                            onChange={handleChange}
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Masajes</FormLabel>
                        <Input
                            name="masajes"
                            type="number"
                            value={newItem.masajes}
                            onChange={handleChange}
                        />
                    </FormControl>
                </SimpleGrid>
                <Button mt={4} colorScheme="blue" onClick={handleAdd}>
                    Add Item
                </Button>
            </Box>

            {/* ── Fortnightly Summary ──────────────────────────────────── */}
            <SimpleGrid columns={{ base: 1, md: 7 }} spacing={4} mb={8}>
                <Stat p={4} borderWidth="1px" borderRadius="md">
                    <StatLabel>Deposito</StatLabel>
                    <StatNumber>${totals.deposit.toFixed(2)}</StatNumber>
                </Stat>
                <Stat p={4} borderWidth="1px" borderRadius="md">
                    <StatLabel>Envios</StatLabel>
                    <StatNumber>${totals.envios.toFixed(2)}</StatNumber>
                </Stat>
                <Stat p={4} borderWidth="1px" borderRadius="md">
                    <StatLabel>Entrada</StatLabel>
                    <StatNumber>${totals.entrada.toFixed(2)}</StatNumber>
                </Stat>
                <Stat p={4} borderWidth="1px" borderRadius="md">
                    <StatLabel>Accesorios</StatLabel>
                    <StatNumber>${totals.accesorios.toFixed(2)}</StatNumber>
                </Stat>
                <Stat p={4} borderWidth="1px" borderRadius="md">
                    <StatLabel>Gastos</StatLabel>
                    <StatNumber>${totals.gastos.toFixed(2)}</StatNumber>
                </Stat>
                <Stat p={4} borderWidth="1px" borderRadius="md">
                    <StatLabel>Salario</StatLabel>
                    <StatNumber>${totals.salario.toFixed(2)}</StatNumber>
                </Stat>
                <Stat p={4} borderWidth="1px" borderRadius="md">
                    <StatLabel>Masajes</StatLabel>
                    <StatNumber>${totals.masajes.toFixed(2)}</StatNumber>
                </Stat>
            </SimpleGrid>

            {/* ── Detailed Table ──────────────────────────────────────── */}
            <Table variant="striped" size="sm">
                <Thead>
                    <Tr>
                        <Th>Day</Th>
                        <Th isNumeric>Deposito</Th>
                        <Th isNumeric>Envios</Th>
                        <Th isNumeric>Entrada</Th>
                        <Th isNumeric>Accesorios</Th>
                        <Th isNumeric>Gastos</Th>
                        <Th isNumeric>Salario</Th>
                        <Th isNumeric>Masajes</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {items.map((item, idx) => (
                        <Tr key={idx}>
                            <Td>{item.day}</Td>
                            <Td isNumeric>{parseFloat(item.deposit).toFixed(2)}</Td>
                            <Td isNumeric>{parseFloat(item.envios).toFixed(2)}</Td>
                            <Td isNumeric>{parseFloat(item.entrada).toFixed(2)}</Td>
                            <Td isNumeric>{parseFloat(item.accesorios).toFixed(2)}</Td>
                            <Td isNumeric>{parseFloat(item.gastos).toFixed(2)}</Td>
                            <Td isNumeric>{parseFloat(item.salario).toFixed(2)}</Td>
                            <Td isNumeric>{parseFloat(item.masajes).toFixed(2)}</Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </Box>
    );
}