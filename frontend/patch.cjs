const fs = require('fs');
let c = fs.readFileSync('src/pages/Reports.jsx', 'utf8');

c = c.replace(
    /const projectsData = response\.data \|\| \[\];\r?\n\s*setProjects\(projectsData\);/,
    `let projectsData = response.data || [];\r\n            if (currentUser?.role === 'Site Manager') {\r\n                projectsData = projectsData.filter(p => p.manager === currentUser.username);\r\n            }\r\n            setProjects(projectsData);`
);

c = c.replace(
    /<GeneratorCard\r?\n\s*title="Financial Summary" desc="Spending breakdown, invoice status, and budget variances\."\r?\n\s*icon=\{<Wallet size=\{16\} className="text-violet-500" \/>\}\r?\n\s*onGenerate=\{[^}]*\}\r?\n\s*onDownload=\{openFinancialPicker\}\r?\n\s*loading=\{generating === 'financial'\}\r?\n\s*\/>/,
    `{['Admin'].includes(currentUser?.role) && (\r\n                                        <GeneratorCard\r\n                                            title="Financial Summary" desc="Spending breakdown, invoice status, and budget variances."\r\n                                            icon={<Wallet size={16} className="text-violet-500" />}\r\n                                            onGenerate={() => generateFinancialSummary(false)}\r\n                                            onDownload={openFinancialPicker}\r\n                                            loading={generating === 'financial'}\r\n                                        />\r\n                                    )}`
);

fs.writeFileSync('src/pages/Reports.jsx', c);
