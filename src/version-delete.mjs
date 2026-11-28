// Never delete the active package or bundled demo; do not accept arbitrary filesystem paths.
export function assertVersionDelete(id,expectedActive,active,versions,outputOpen=false){
 if(outputOpen)throw Error('공연 종료 후 대본을 삭제하세요.');
 if(expectedActive!==active)throw Error('활성 대본이 변경되었습니다. 목록을 다시 확인하세요.');
 if(id===active||id==='demo')throw Error('사용 중인 대본과 기본 테스트 대본은 삭제할 수 없습니다.');
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id)||!versions.has(id))throw Error('삭제할 대본 버전을 찾을 수 없습니다.');
}
