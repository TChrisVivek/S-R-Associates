const fs = require('fs');
const path = require('path');

const pagesDir = 'd:\\SR Associates\\frontend\\src\\pages';
if (!fs.existsSync(pagesDir)) {
    console.error("Pages directory not found!");
    process.exit(1);
}

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    let originalContent = content;

    content = content.replace(
        /<NavItem icon=\{<Users size=\{17\} \/>\} text="Personnel"( active)? href="\/personnel" \/>/g,
        '{[\'Admin\', \'Site Manager\'].includes(currentUser?.role) && <NavItem icon={<Users size={17} />} text="Personnel"$1 href="/personnel" />}'
    );

    content = content.replace(
        /<NavItem icon=\{<BarChart3 size=\{17\} \/>\} text="Budget"( active)? href="\/budget" \/>/g,
        '{[\'Admin\'].includes(currentUser?.role) && <NavItem icon={<BarChart3 size={17} />} text="Budget"$1 href="/budget" />}'
    );

    content = content.replace(
        /<NavItem icon=\{<FileText size=\{17\} \/>\} text="Reports"( active)? href="\/reports" \/>/g,
        '{[\'Admin\', \'Site Manager\', \'Client\'].includes(currentUser?.role) && <NavItem icon={<FileText size={17} />} text="Reports"$1 href="/reports" />}'
    );

    content = content.replace(
        /<div className="px-3 mt-6 mb-3">[\s\S]*?<p className="text-\[10px\] font-semibold text-white\/20 uppercase tracking-widest">System<\/p>[\s\S]*?<\/div>[\s\n]*<NavItem icon=\{<Settings size=\{17\} \/>\} text="Settings"( active)? href="\/settings" \/>/g,
        `{['Admin', 'Site Manager'].includes(currentUser?.role) && (
                        <>
                            <div className="px-3 mt-6 mb-3">
                                <p className="text-[10px] font-semibold text-white/20 uppercase tracking-widest">System</p>
                            </div>
                            <NavItem icon={<Settings size={17} />} text="Settings"$1 href="/settings" />
                        </>
                    )}`
    );

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    }
}
