import { addDoc, QuerySnapshot, collection, doc, documentId, getDoc, getDocs, getFirestore, query, setDoc, where } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, User, onAuthStateChanged, signOut } from 'firebase/auth';
import Firebase from './firebase';
import { Member } from '../data/member';
import { getDatabase, onValue, ref, set, push, DatabaseReference, remove, Unsubscribe } from 'firebase/database';

function snapshotToMembers(snapshot: QuerySnapshot) {
    const members: Member[] = [];
    snapshot.forEach(doc => {
        members.push({
            id: doc.id,
            ...doc.data(),
        } as Member);
    });

    return members;
}

type GameCategory = 'upcoming' | 'playing';

function addGame(category: GameCategory, game: {team1: string[], team2: string[]}): Promise<void> {
    return set(push(ref(getDatabase(), category)), game);
}

function listenToGames(category: GameCategory, listener: (games: {team1: string[], team2: string[], ref: DatabaseReference}[]) => void): Unsubscribe {
    return onValue(ref(getDatabase(), category), snapshot => {
        const upcomingGames: {team1: string[], team2: string[], ref: DatabaseReference}[] = [];
        snapshot.forEach(gameSnapshot => {
            upcomingGames.push({
                ...gameSnapshot.val(),
                ref: gameSnapshot.ref,
            });
        });
        listener(upcomingGames);
    });
}

const firebaseImpl: Firebase = {
    signIn() {
        const auth = getAuth();
        if (auth.currentUser != null) {
            return;
        }

        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        signInWithPopup(auth, provider);
    },

    signOut() {
        signOut(getAuth());
    },

    onAuthStateChanged(callback: (user: User | null) => void) {
        return onAuthStateChanged(getAuth(), user => callback(user));
    },

    register(id: string, name: string) {
        return setDoc(doc(getFirestore(), 'googlers', id), {
            name,
            elo: 1000,
            role: 'member',
        });
    },

    async getGoogler(user: User) {
        const snapshot = await getDoc(doc(getFirestore(), 'googlers', user.uid));
        return {
            user,
            ...snapshot.data(),
        };
    },

    async getAllMembers() {
        const snapshot = await getDocs(collection(getFirestore(), 'googlers'));
        return snapshotToMembers(snapshot);
    },

    async getMembersById(ids: string[]) {
        const snapshot = await getDocs(query(collection(getFirestore(), 'googlers'),
            where(documentId(), 'in', ids)));
        return snapshotToMembers(snapshot);
    },

    async updateSessionMemberIds(ids: string[]) {
        console.log(ids);
        try {
            await set(ref(getDatabase(), 'members'), ids);
        } catch(e) {
            console.error(e);
        }
    },

    listenToSessionMemberIds(listener: (ids: string[]) => void) {
        return onValue(ref(getDatabase(), 'members'), (snapshot) => {
            listener(snapshot.val());
        });
    },

    addUpcomingGame(team1: string[], team2: string[]) {
        return addGame('upcoming', {team1, team2});
    },

    listenToUpcomingGames(listener: (games: {team1: string[], team2: string[], ref: DatabaseReference}[]) => void) {
        return listenToGames('upcoming', listener);
    },

    addPlayingGame(team1: string[], team2: string[]) {
        return addGame('playing', {team1, team2});
    },

    listenToPlayingGames(listener: (games: {team1: string[], team2: string[], ref: DatabaseReference}[]) => void) {
        return listenToGames('playing', listener);
    },

    async addGameResult(win, lose) {
        await addDoc(collection(getFirestore(), 'gameResult'), {win, lose});
    },

    update(ref, value) {
        return set(ref, value);
    },

    delete(ref) {
        return remove(ref);
    }
};

export default firebaseImpl;