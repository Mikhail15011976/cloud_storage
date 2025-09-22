const fs = require('fs');
const path = require('path');

class MemoryLeakDetector {
  constructor() {
    this.issues = [];
    this.patterns = [
      {
        name: 'setInterval без очистки',
        pattern: /setInterval\s*\([^)]*\)/g,
        cleanup: /clearInterval/,
        severity: 'high'
      },
      {
        name: 'EventListener без removeEventListener',
        pattern: /addEventListener\s*\([^)]*\)/g,
        cleanup: /removeEventListener/,
        severity: 'high'
      },
      {
        name: 'AbortController без abort()',
        pattern: /new\s+AbortController\s*\(\s*\)/g,
        cleanup: /\.abort\s*\(\s*\)/,
        severity: 'high'
      },
      {
        name: 'createObjectURL без revokeObjectURL',
        pattern: /(URL\.)?createObjectURL\s*\([^)]*\)/g,
        cleanup: /revokeObjectURL/,
        severity: 'medium'
      },
      {
        name: 'setTimeout без очистки (долгий)',
        pattern: /setTimeout\s*\([^)]*,\s*(1[0-9]{3,}|[2-9][0-9]{3,})/g,
        cleanup: /clearTimeout/,
        severity: 'medium'
      },
      {
        name: 'Подписка на события без отписки',
        pattern: /\.on\s*\([^)]*\)|\.subscribe\s*\([^)]*\)/g,
        cleanup: /\.off|\.unsubscribe/,
        severity: 'medium'
      },
      {
        name: 'Незакрытые соединения/ресурсы',
        pattern: /(open|create|connect)\s*\([^)]*\)/g,
        cleanup: /(close|destroy|disconnect)\s*\([^)]*\)/,
        severity: 'high'
      }
    ];
  }

  scanProject() {
    console.log('🔍 Начинаем сканирование проекта на утечки памяти...\n');
    
    const srcPath = path.join(__dirname, '../src');
    if (!fs.existsSync(srcPath)) {
      console.error('❌ Папка src не найдена!');
      return false;
    }

    const files = this.getAllFiles(srcPath);
    console.log(`📁 Найдено файлов: ${files.length}`);

    let totalIssues = 0;

    files.forEach(file => {
      if (this.isJavaScriptFile(file)) {
        const issues = this.scanFile(file);
        totalIssues += issues;
      }
    });

    this.generateReport(totalIssues);
    return totalIssues === 0;
  }

  getAllFiles(dirPath, arrayOfFiles = []) {
    try {
      const files = fs.readdirSync(dirPath);

      files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Пропускаем node_modules и скрытые папки
          if (!file.includes('node_modules') && !file.startsWith('.')) {
            this.getAllFiles(fullPath, arrayOfFiles);
          }
        } else {
          arrayOfFiles.push(fullPath);
        }
      });

      return arrayOfFiles;
    } catch (error) {
      console.error(`❌ Ошибка чтения папки ${dirPath}:`, error.message);
      return arrayOfFiles;
    }
  }

  isJavaScriptFile(filePath) {
    return /\.(js|jsx)$/.test(filePath);
  }

  scanFile(filePath) {
    let fileIssues = 0;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const relativePath = path.relative(path.join(__dirname, '..'), filePath);

      this.patterns.forEach(patternConfig => {
        lines.forEach((line, index) => {
          const matches = line.match(patternConfig.pattern);
          if (matches) {
            matches.forEach(match => {
              const hasCleanup = this.checkForCleanup(content, patternConfig.cleanup, match);
              
              if (!hasCleanup) {
                fileIssues++;
                this.issues.push({
                  file: relativePath,
                  line: index + 1,
                  pattern: patternConfig.name,
                  match: match.trim(),
                  severity: patternConfig.severity
                });
              }
            });
          }
        });
      });

      if (fileIssues > 0) {
        console.log(`❌ ${relativePath}: найдено ${fileIssues} проблем`);
      }

    } catch (error) {
      console.error(`❌ Ошибка чтения файла ${filePath}:`, error.message);
    }

    return fileIssues;
  }

  checkForCleanup(content, cleanupPattern, match) {
    // Базовая проверка наличия cleanup функции
    if (cleanupPattern.test(content)) {
      return true;
    }

    // Дополнительные эвристические проверки
    const heuristicPatterns = [
      /useEffect.*return.*function/, // Cleanup в useEffect
      /componentWillUnmount/,        // React lifecycle
      /destroy|dispose|cleanup/,     // Общие cleanup слова
      /finally\s*{/                  // finally блок
    ];

    return heuristicPatterns.some(pattern => pattern.test(content));
  }

  generateReport(totalIssues) {
    console.log('\n📊 ОТЧЕТ О ПРОВЕРКЕ ПАМЯТИ');
    console.log('=' .repeat(50));

    if (totalIssues === 0) {
      console.log('✅ Потенциальных утечек памяти не обнаружено!');
      return;
    }

    console.log(`❌ Найдено потенциальных проблем: ${totalIssues}\n`);

    // Группируем проблемы по файлам
    const issuesByFile = this.issues.reduce((acc, issue) => {
      if (!acc[issue.file]) acc[issue.file] = [];
      acc[issue.file].push(issue);
      return acc;
    }, {});

    Object.entries(issuesByFile).forEach(([file, issues]) => {
      console.log(`\n📄 ${file}:`);
      issues.forEach(issue => {
        const severityIcon = issue.severity === 'high' ? '🔴' : '🟡';
        console.log(`   ${severityIcon} Строка ${issue.line}: ${issue.pattern}`);
        console.log(`      Пример: ${issue.match.substring(0, 60)}...`);
      });
    });

    const highSeverity = this.issues.filter(i => i.severity === 'high').length;
    const mediumSeverity = this.issues.filter(i => i.severity === 'medium').length;

    console.log('\n📈 СТАТИСТИКА:');
    console.log(`   🔴 Высокий риск: ${highSeverity}`);
    console.log(`   🟡 Средний риск: ${mediumSeverity}`);
    
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    console.log('   1. Всегда очищайте интервалы и таймауты');
    console.log('   2. Удаляйте event listeners при размонтировании');
    console.log('   3. Используйте AbortController для отмены запросов');
    console.log('   4. Освобождайте URL.createObjectURL()');
    console.log('   5. Проверяйте cleanup функции в useEffect');
  }
}

// Запуск проверки
if (require.main === module) {
  const detector = new MemoryLeakDetector();
  const success = detector.scanProject();
  process.exit(success ? 0 : 1);
}

module.exports = MemoryLeakDetector;