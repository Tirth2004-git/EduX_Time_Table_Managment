const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'backend', 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
const stringIdModels = ['Department', 'Semester', 'Division', 'Subject', 'Teacher', 'Classroom', 'Laboratory', 'TeacherSubjectMapping'];

files.forEach(f => {
  let content = fs.readFileSync(path.join(modelsDir, f), 'utf8');
  let changed = false;
  
  stringIdModels.forEach(model => {
    // Regex to find: type: mongoose.Schema.Types.ObjectId, ref: 'Model'
    const regex1 = new RegExp(`type:\\s*mongoose\\.Schema\\.Types\\.ObjectId,\\s*ref:\\s*['"\`]${model}['"\`]`, 'g');
    if (regex1.test(content)) {
      content = content.replace(regex1, `type: String, ref: '${model}'`);
      changed = true;
    }
    
    // Regex to find: ref: 'Model', type: mongoose.Schema.Types.ObjectId
    const regex2 = new RegExp(`ref:\\s*['"\`]${model}['"\`],\\s*type:\\s*mongoose\\.Schema\\.Types\\.ObjectId`, 'g');
    if (regex2.test(content)) {
      content = content.replace(regex2, `ref: '${model}', type: String`);
      changed = true;
    }
    
    // Also handle when they are on multiple lines and potentially separated by other fields
    // A more generic replace: if we see ref: 'Model', we look around it.
    const regex3 = new RegExp(`(type:\\s*mongoose\\.Schema\\.Types\\.ObjectId[^}]*ref:\\s*['"\`]${model}['"\`])`, 'g');
    if (regex3.test(content)) {
       content = content.replace(regex3, match => match.replace(/mongoose\.Schema\.Types\.ObjectId/, 'String'));
       changed = true;
    }
    
    const regex4 = new RegExp(`(ref:\\s*['"\`]${model}['"\`][^}]*type:\\s*mongoose\\.Schema\\.Types\\.ObjectId)`, 'g');
    if (regex4.test(content)) {
       content = content.replace(regex4, match => match.replace(/mongoose\.Schema\.Types\.ObjectId/, 'String'));
       changed = true;
    }
  });
  
  // Specific fix for some models where multiline is tricky
  if (['ScheduledSession.js', 'Timetable.js', 'TeacherAssignment.js', 'TeacherLeave.js', 'SubstitutionRequest.js', 'Notification.js', 'ClassRoomMapping.js'].includes(f)) {
     stringIdModels.forEach(model => {
        const typeRegex = new RegExp(`(ref:\\s*['"\`]${model}['"\`].*?type:\\s*)mongoose\\.Schema\\.Types\\.ObjectId`, 'gs');
        const oldContent = content;
        content = content.replace(typeRegex, '$1String');
        
        const typeRegex2 = new RegExp(`(type:\\s*)mongoose\\.Schema\\.Types\\.ObjectId(.*?ref:\\s*['"\`]${model}['"\`])`, 'gs');
        content = content.replace(typeRegex2, '$1String$2');
        if (oldContent !== content) changed = true;
     });
  }
  
  if (changed) {
    fs.writeFileSync(path.join(modelsDir, f), content);
    console.log('Fixed ' + f);
  }
});
