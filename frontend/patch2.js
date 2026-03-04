const fs = require('fs');
const filePath = 'd:\\\\SR Associates\\\\frontend\\\\src\\\\pages\\\\Settings.jsx';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(
    '<div className="text-gray-400 text-xs font-medium text-center">No Logo</div>',
    '<CompanyLogo className="w-full h-full object-contain p-2" defaultLogoType="dark" />'
);
fs.writeFileSync(filePath, content);
