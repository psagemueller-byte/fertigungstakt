export default async function handler(req, res) {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!token || !baseId) {
    return res.status(500).json({ error: 'AIRTABLE_TOKEN oder AIRTABLE_BASE_ID nicht konfiguriert' });
  }

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const url = `https://api.airtable.com/v0/${baseId}/Maschinen?fields%5B%5D=Maschinen+ID&fields%5B%5D=Gruppe&fields%5B%5D=Hersteller&fields%5B%5D=Maschine&fields%5B%5D=Seriennummer`;

    const allRecords = [];
    let offset = undefined;

    // Pagination: Airtable liefert max 100 Records pro Request
    do {
      const pageUrl = offset ? `${url}&offset=${offset}` : url;
      const response = await fetch(pageUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: `Airtable Fehler: ${text}` });
      }

      const data = await response.json();
      allRecords.push(...data.records);
      offset = data.offset;
    } while (offset);

    const machines = allRecords.map((record) => ({
      airtableId: record.id,
      maschinenId: record.fields['Maschinen ID'] || '',
      gruppe: record.fields['Gruppe'] || '',
      hersteller: record.fields['Hersteller'] || '',
      maschine: record.fields['Maschine'] || '',
      seriennummer: record.fields['Seriennummer'] || '',
    }));

    return res.status(200).json({ machines });
  } catch (err) {
    return res.status(500).json({ error: `Fehler: ${err.message}` });
  }
}
