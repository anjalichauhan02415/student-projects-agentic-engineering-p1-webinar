const supabaseUrl = "https://chmbsdsjjxaxecawruut.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobWJzZHNqanhheGVjYXdydXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxODMwMjksImV4cCI6MjEwMTc1OTAyOX0.TN8atO_JrA6p7240zCP4hChDHmfi7QZn67v0gdE0Cxo";

// Set isPlaceholder to false so it always connects directly to Supabase
const isPlaceholder = false;

let supabaseClient = null;

if (!isPlaceholder && typeof supabase !== 'undefined') {
    try {
        supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);
        console.log("MSR Cafe connected to live Supabase:", supabaseUrl);
    } catch (e) {
        console.error("Failed to initialize Supabase client:", e);
    }
}

if (!supabaseClient) {
    console.warn("Supabase credentials not configured. Running in Local Storage Demo Mode.");

    // Polyfill database queries using LocalStorage
    supabaseClient = {
        from: (table) => {
            return {
                insert: async (data) => {
                    await new Promise(r => setTimeout(r, 600)); // Simulate network latency
                    try {
                        const storeKey = `msr_db_${table}`;
                        const list = JSON.parse(localStorage.getItem(storeKey) || '[]');
                        const records = Array.isArray(data) ? data : [data];

                        records.forEach(r => {
                            list.push({
                                ...r,
                                created_at: new Date().toISOString()
                            });
                        });

                        localStorage.setItem(storeKey, JSON.stringify(list));
                        return { data: records, error: null };
                    } catch (err) {
                        return { data: null, error: err };
                    }
                },
                select: (columns = '*') => {
                    return {
                        order: (column, { ascending = false } = {}) => {
                            // Support thenable directly to match mock/Supabase client structure
                            return {
                                then: async (resolve) => {
                                    await new Promise(r => setTimeout(r, 400)); // Network delay
                                    try {
                                        const storeKey = `msr_db_${table}`;
                                        const list = JSON.parse(localStorage.getItem(storeKey) || '[]');
                                        list.sort((a, b) => {
                                            const valA = a[column];
                                            const valB = b[column];
                                            if (column === 'created_at') {
                                                return ascending
                                                    ? new Date(valA).getTime() - new Date(valB).getTime()
                                                    : new Date(valB).getTime() - new Date(valA).getTime();
                                            }
                                            return ascending ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
                                        });
                                        resolve({ data: list, error: null });
                                    } catch (err) {
                                        resolve({ data: null, error: err });
                                    }
                                }
                            };
                        }
                    };
                },
                update: (updateData) => {
                    return {
                        eq: (field, value) => {
                            return {
                                then: async (resolve) => {
                                    await new Promise(r => setTimeout(r, 400));
                                    try {
                                        const storeKey = `msr_db_${table}`;
                                        const list = JSON.parse(localStorage.getItem(storeKey) || '[]');
                                        let updatedCount = 0;
                                        const updatedList = list.map(item => {
                                            if (item[field] === value) {
                                                updatedCount++;
                                                return { ...item, ...updateData };
                                            }
                                            return item;
                                        });
                                        localStorage.setItem(storeKey, JSON.stringify(updatedList));
                                        resolve({ data: updatedList.filter(item => item[field] === value), error: null });
                                    } catch (err) {
                                        resolve({ data: null, error: err });
                                    }
                                }
                            };
                        }
                    };
                }
            };
        }
    };
}

window.supabaseClient = supabaseClient;
