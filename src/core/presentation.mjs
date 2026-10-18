// Presentation mode is a view restriction. It never translates or changes a project.
export function projectIsEnglish(project){return project?.locale==='en'&&!/[\u3400-\u9fff]/u.test(JSON.stringify({title:project.title,slides:project.slides,sources:project.sources}));}
