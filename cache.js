/**
 * MoStudy Cache Helper
 * Handles local caching and syncing with the Appwrite backend
 */

const MoStudyCache = {
    /**
     * Save a report to the backend and update local cache
     * @param {Function} getAuthToken - Function to get current JWT
     * @param {string} type - 'quiz' or 'roleplay'
     * @param {Object} data - The report data
     */
    async saveReportAndUpdateCache(getAuthToken, type, data) {
        console.log(`📦 Cache: Saving ${type} report...`);
        
        try {
            if (!window.appwriteDatabases) {
                 throw new Error('Appwrite Databases not initialized');
            }

            const user = await window.appwriteAccount.get();
            const userId = user.$id;
            const databaseId = window.APPWRITE_CONFIG.databaseId;
            const collectionId = type === 'quiz' 
                ? window.APPWRITE_CONFIG.collections.quizReports 
                : window.APPWRITE_CONFIG.collections.roleplayReports;
            const timestamp = new Date().toISOString();

            // Note: Attribute is 'userid' (lowercase) in Database based on recent logs
            let reportDoc = {
                userid: userId,
                timestamp
            };

            if (type === 'quiz') {
                reportDoc = {
                    ...reportDoc,
                    category: String(data.category || 'Unknown'),
                    score: Number(data.score) || 0,
                    totalQuestions: Number(data.totalQuestions) || 0,
                    correctAnswers: Number(data.correctAnswers) || 0,
                    // Ensure categoryScores is stringified for Appwrite String attribute
                    categoryScores: typeof data.categoryScores === 'object' 
                        ? JSON.stringify(data.categoryScores) 
                        : String(data.categoryScores || '{}')
                };
            } else {
                reportDoc = {
                    ...reportDoc,
                    event: String(data.event || 'Unknown'),
                    difficulty: String(data.difficulty || 'official'),
                    judgeScore: Number(data.judgeScore) || 0,
                    feedback: String(data.feedback || ''),
                    // Ensure categoryScores is stringified
                    categoryScores: typeof data.categoryScores === 'object' 
                        ? JSON.stringify(data.categoryScores) 
                        : String(data.categoryScores || '{}'),
                    fullTranscript: String(data.fullTranscript || '')
                };
            }

            const result = await window.appwriteDatabases.createDocument(
                databaseId,
                collectionId,
                'unique()',
                reportDoc
            );

            console.log(`✅ Cache: ${type} report saved directly to Appwrite`);
            
            // Update local storage for immediate UI feedback
            this.updateLocalStorage(type, { [type === 'quiz' ? 'quizSummaries' : 'roleplaySummaries']: [result] });
            
            return result;
        } catch (error) {
            console.error(`❌ Cache: Failed to save ${type} report:`, error);
            // Non-blocking for the user
            throw error;
        }
    },

    /**
     * Clear user-specific cache on logout
     */
    clearUserCache() {
        console.log('🧹 Cache: Clearing user data...');
        localStorage.removeItem('mostudy_user_stats');
        localStorage.removeItem('mostudy_last_reports');
    },

    /**
     * Update local storage with fresh data from server
     */
    updateLocalStorage(type, serverResponse) {
        if (serverResponse.stats) {
            localStorage.setItem('mostudy_user_stats', JSON.stringify(serverResponse.stats));
        }
        
        // Store last 5 reports for dashboard
        if (serverResponse.quizSummaries || serverResponse.roleplaySummaries) {
            const lastReports = {
                quizzes: serverResponse.quizSummaries || [],
                roleplays: serverResponse.roleplaySummaries || [],
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('mostudy_last_reports', JSON.stringify(lastReports));
        }
    }
};

window.MoStudyCache = MoStudyCache;
